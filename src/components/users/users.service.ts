import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { UserEntity } from '../../schema/User.model';
import { UserGroupEntity } from '../../schema/User_Group.model';
import { UserRole, UserStatus } from '../../libs/enums/user.enum';
import { UserUpdate } from 'src/libs/dto/users/userUpdate';
import { Cron } from '@nestjs/schedule';
import { LessThan } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,

    @InjectRepository(UserGroupEntity)
    private userGroupRepo: Repository<UserGroupEntity>,
  ) {}

  async getMe(userId: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUser(userId: string, input: UserUpdate): Promise<UserEntity> {
    await this.userRepo.update(userId, { ...input });
    return this.getMe(userId);
  }

  async getMyGroups(userId: string): Promise<UserGroupEntity[]> {
    return this.userGroupRepo.find({
      where: {
        userId,
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  // ADMIN
  async getAllUsers(): Promise<UserEntity[]> {
    return this.userRepo.find({
      where: { userStatus: UserStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  async blockUser(userId: string): Promise<UserEntity> {
    await this.userRepo.update(userId, { userStatus: UserStatus.BLOCKED });
    return this.getMe(userId);
  }

  async changeRole(userId: string, userRole: UserRole): Promise<UserEntity> {
    await this.userRepo.update(userId, { userRole });
    return this.getMe(userId);
  }

  @Cron('0 0 * * *')
  async expirePremiumAccess() {
    const expired = await this.userRepo.find({
      where: {
        userRole: UserRole.ACADEM_STUDENT,
        premiumExpiresAt: LessThan(new Date()),
      },
    });

    if (expired.length > 0) {
      for (const user of expired) {
        await this.userRepo.update(user.id, {
          userRole: UserRole.STUDENT,
          premiumExpiresAt: null,
        });
      }
      console.log(`Expired premium access for ${expired.length} users`);
    }
  }
}
