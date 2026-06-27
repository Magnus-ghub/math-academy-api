import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UserEntity } from '../../schema/User.model';
import { UserGroupEntity } from '../../schema/User_Group.model';
import { UserRole } from '../../libs/enums/user.enum';
import { UserUpdate, AdminUserUpdate } from 'src/libs/dto/users/userUpdate';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,

    @InjectRepository(UserGroupEntity)
    private userGroupRepo: Repository<UserGroupEntity>,
  ) {}

  async getMe(userId: string): Promise<UserEntity & { hasPassword: boolean }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return Object.assign(user, { hasPassword: !!user.userPassword });
  }

  async updateUser(userId: string, input: UserUpdate): Promise<UserEntity> {
    await this.userRepo.update(userId, { ...input });
    return this.getMe(userId);
  }

  async searchUsers(search: string): Promise<UserEntity[]> {
    return this.userRepo
      .createQueryBuilder('u')
      .where(
        'u.userName ILIKE :q OR u.userLastName ILIKE :q OR u.userPhone ILIKE :q OR u.telegramId ILIKE :q',
        { q: `%${search}%` },
      )
      .orderBy('u.userName', 'ASC')
      .limit(20)
      .getMany();
  }

  async adminUpdateUser(userId: string, input: AdminUserUpdate): Promise<UserEntity> {
    await this.userRepo.update(userId, { ...input });
    return this.getMe(userId);
  }

  async getAllUsers(): Promise<UserEntity[]> {
    return this.userRepo.find({ order: { createdAt: 'DESC' } });
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
