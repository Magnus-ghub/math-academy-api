import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity, UserDocument } from '../../schema/User.model';
import { UserGroupEntity, UserGroupDocument } from '../../schema/User_Group.model';
import { UserRole } from '../../libs/enums/user.enum';
import { UserUpdate, AdminUserUpdate } from 'src/libs/dto/users/userUpdate';
import { Cron } from '@nestjs/schedule';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserEntity.name)
    private userModel: Model<UserDocument>,

    @InjectModel(UserGroupEntity.name)
    private userGroupModel: Model<UserGroupDocument>,
  ) {}

  async getMe(userId: string): Promise<UserDocument & { hasPassword: boolean }> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return Object.assign(user, { hasPassword: !!user.userPassword });
  }

  async updateUser(userId: string, input: UserUpdate): Promise<UserDocument> {
    await this.userModel.updateOne({ _id: userId }, { $set: { ...input } });
    return this.getMe(userId);
  }

  async searchUsers(search: string): Promise<UserDocument[]> {
    const pattern = new RegExp(escapeRegex(search), 'i');
    return this.userModel
      .find({
        $or: [
          { userName: pattern },
          { userLastName: pattern },
          { userPhone: pattern },
          { telegramId: pattern },
        ],
      })
      .sort({ userName: 1 })
      .limit(20);
  }

  async adminUpdateUser(userId: string, input: AdminUserUpdate): Promise<UserDocument> {
    await this.userModel.updateOne({ _id: userId }, { $set: { ...input } });
    return this.getMe(userId);
  }

  async getAllUsers(): Promise<UserDocument[]> {
    return this.userModel.find().sort({ createdAt: -1 });
  }

  async changeRole(userId: string, userRole: UserRole): Promise<UserDocument> {
    await this.userModel.updateOne({ _id: userId }, { $set: { userRole } });
    return this.getMe(userId);
  }

  @Cron('0 0 * * *')
  async expirePremiumAccess() {
    const expired = await this.userModel.find({
      userRole: UserRole.ACADEM_STUDENT,
      premiumExpiresAt: { $lt: new Date() },
    });

    if (expired.length > 0) {
      for (const user of expired) {
        await this.userModel.updateOne(
          { _id: user.id },
          { $set: { userRole: UserRole.STUDENT, premiumExpiresAt: null } },
        );
      }
      console.log(`Expired premium access for ${expired.length} users`);
    }
  }
}
