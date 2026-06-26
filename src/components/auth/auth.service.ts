import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from 'src/schema/User.model';
import { GroupEntity } from 'src/schema/Group.model';
import { UserGroupEntity } from 'src/schema/User_Group.model';
import { UserAuthType, UserRole, UserStatus } from 'src/libs/enums/user.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,

    @InjectRepository(GroupEntity)
    private groupRepo: Repository<GroupEntity>,

    @InjectRepository(UserGroupEntity)
    private userGroupRepo: Repository<UserGroupEntity>,

    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  private generateToken(user: UserEntity, groups: UserGroupEntity[]) {
    const payload = {
      userId: user.id,
      userRole: user.userRole,
      groups: groups.map((g) => ({
        groupId: g.groupId,
        groupType: g.groupType,
        expiresAt: g.expiresAt,
      })),
    };
    return this.jwtService.sign(payload);
  }

  // Telegram data ni verify qilish
  private verifyTelegramHash(data: {
    telegramId: string;
    userName?: string;
    userLastName?: string;
    userImage?: string;
    hash: string;
    authDate: number;
  }): boolean {
    if (process.env.NODE_ENV === 'development') return true;
    const { hash, ...rest } = data;

    // Auth date 24 soatdan eski bo'lsa rad etish
    const now = Math.floor(Date.now() / 1000);
    if (now - rest.authDate > 86400) return false;

    // Data string yaratish
    const dataString = Object.entries({
      auth_date: rest.authDate,
      first_name: rest.userName,
      id: rest.telegramId,
      last_name: rest.userLastName,
      photo_url: rest.userImage,
    })
      .filter(([_, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    // Secret key — Login Widget uchun sha256(bot_token)
    const secretKey = crypto
      .createHash('sha256')
      .update(this.config.get<string>('TELEGRAM_BOT_TOKEN')!)
      .digest();

    // Hash tekshirish
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataString)
      .digest('hex');

    return expectedHash === hash;
  }

  // Telegram guruhda borligini tekshirish
  private async checkTelegramGroups(
    telegramId: string,
  ): Promise<GroupEntity[]> {
    const groups = await this.groupRepo.find({
      where: { groupStatus: 'ACTIVE' as any },
    });

    const memberGroups: GroupEntity[] = [];

    for (const group of groups) {
      try {
        const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
        const res = await fetch(
          `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${group.telegramChatId}&user_id=${telegramId}`,
        );
        const data = await res.json();
        if (
          ['member', 'administrator', 'creator'].includes(data.result?.status)
        ) {
          memberGroups.push(group);
        }
      } catch {
        continue;
      }
    }

    return memberGroups;
  }

  // user_groups jadvalini yangilash
  private async syncUserGroups(user: UserEntity, memberGroups: GroupEntity[]) {
    await this.userGroupRepo.delete({ userId: user.id });

    for (const group of memberGroups) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + group.durationMonths);
      const userGroup = this.userGroupRepo.create({
        userId: user.id,
        groupId: group.id,
        groupType: group.groupType,
        expiresAt,
      });
      await this.userGroupRepo.save(userGroup);
    }

    const saved = await this.userGroupRepo.find({ where: { userId: user.id } });
    const nameMap = new Map(memberGroups.map((g) => [g.id, g.groupName]));
    return saved.map((ug) =>
      Object.assign(ug, { groupName: nameMap.get(ug.groupId) ?? '' }),
    );
  }

  // Telegram login
  async telegramLogin(telegramData: {
    telegramId: string;
    userName?: string;
    userLastName?: string;
    userImage?: string;
    hash: string;
    authDate: number;
  }) {
    if (!this.verifyTelegramHash(telegramData)) {
      throw new UnauthorizedException('Invalid Telegram data');
    }
    let user = await this.userRepo.findOne({
      where: { telegramId: telegramData.telegramId },
    });

    if (!user) {
      user = this.userRepo.create({
        telegramId: telegramData.telegramId,
        userName: telegramData.userName,
        userLastName: telegramData.userLastName,
        userImage: telegramData.userImage,
        userAuthType: UserAuthType.TELEGRAM,
        userRole: UserRole.STUDENT,
        userStatus: UserStatus.ACTIVE,
      });
      await this.userRepo.save(user);
    }

    // Guruhlarni tekshirish
    const memberGroups = await this.checkTelegramGroups(
      telegramData.telegramId,
    );
    const userGroups = await this.syncUserGroups(user, memberGroups);

    return {
      accessToken: this.generateToken(user, userGroups),
      user,
      groups: userGroups,
    };
  }

  // Google login
  async googleLogin(googleData: {
    googleId: string;
    name: string;
    email: string;
    avatar?: string;
  }) {
    let user = await this.userRepo.findOne({
      where: { googleId: googleData.googleId },
    });

    if (!user) {
      user = this.userRepo.create({
        googleId: googleData.googleId,
        userName: googleData.name,
        userImage: googleData.avatar,
        userAuthType: UserAuthType.GOOGLE,
        userRole: UserRole.STUDENT,
        userStatus: UserStatus.ACTIVE,
      });
      await this.userRepo.save(user);
    }

    const userGroups = await this.userGroupRepo.find({
      where: { userId: user.id },
    });

    return {
      accessToken: this.generateToken(user, userGroups),
      user,
      groups: userGroups,
    };
  }

  // Token tekshirish
  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
