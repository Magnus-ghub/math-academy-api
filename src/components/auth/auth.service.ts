import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
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

  private verifyTelegramHash(data: {
    telegramId: string;
    userName?: string;
    userLastName?: string;
    userImage?: string;
    telegramUsername?: string;
    hash: string;
    authDate: number;
  }): boolean {
    if (process.env.NODE_ENV === 'development') return true;
    const { hash, ...rest } = data;

    const now = Math.floor(Date.now() / 1000);
    if (now - rest.authDate > 86400) return false;

    const dataString = Object.entries({
      auth_date: rest.authDate,
      first_name: rest.userName,
      id: rest.telegramId,
      last_name: rest.userLastName,
      photo_url: rest.userImage,
      username: rest.telegramUsername,
    })
      .filter(([_, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto
      .createHash('sha256')
      .update(this.config.get<string>('TELEGRAM_BOT_TOKEN')!)
      .digest();

    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataString)
      .digest('hex');

    return expectedHash === hash;
  }

  private async checkTelegramGroups(telegramId: string): Promise<GroupEntity[]> {
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
        if (['member', 'administrator', 'creator'].includes(data.result?.status)) {
          memberGroups.push(group);
        }
      } catch {
        continue;
      }
    }

    return memberGroups;
  }

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

  private async sendEmail(to: string, subject: string, html: string) {
    const smtpHost = this.config.get<string>('SMTP_HOST');
    const smtpPort = this.config.get<number>('SMTP_PORT') ?? 587;
    const smtpUser = this.config.get<string>('SMTP_USER');
    const smtpPass = this.config.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('SMTP sozlanmagan — email yuborilmadi:', subject, 'to:', to);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"Saidxonov Academy" <${smtpUser}>`,
      to,
      subject,
      html,
    });
  }

  async telegramLogin(telegramData: {
    telegramId: string;
    userName?: string;
    userLastName?: string;
    userImage?: string;
    telegramUsername?: string;
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
    } else {
      // Ism/familiya faqat bo'sh bo'lsa yangilanadi (user o'zi tahrirlagan bo'lishi mumkin)
      // Rasm esa har doim Telegramdan yangilanadi (agar user o'zi yuklamagan bo'lsa)
      let changed = false;
      if (!user.userName && telegramData.userName) {
        user.userName = telegramData.userName;
        changed = true;
      }
      if (!user.userLastName && telegramData.userLastName) {
        user.userLastName = telegramData.userLastName;
        changed = true;
      }
      if (telegramData.userImage && !user.userImage) {
        user.userImage = telegramData.userImage;
        changed = true;
      }
      if (changed) await this.userRepo.save(user);
    }

    const memberGroups = await this.checkTelegramGroups(telegramData.telegramId);
    const userGroups = await this.syncUserGroups(user, memberGroups);

    return {
      accessToken: this.generateToken(user, userGroups),
      user,
      groups: userGroups,
      isNewUser: false,
    };
  }

  // Google login/register — email saqlaydi, yangi foydalanuvchi bo'lsa isNewUser=true
  async googleLogin(googleData: {
    googleId: string;
    name: string;
    email: string;
    avatar?: string;
  }) {
    let isNewUser = false;

    let user = await this.userRepo.findOne({
      where: { googleId: googleData.googleId },
    });

    if (!user && googleData.email) {
      user = await this.userRepo.findOne({ where: { userEmail: googleData.email } });
      if (user) {
        // Mavjud email bilan topildi — googleId ni bog'laymiz
        user.googleId = googleData.googleId;
        if (!user.userImage && googleData.avatar) user.userImage = googleData.avatar;
        await this.userRepo.save(user);
      }
    }

    if (!user) {
      isNewUser = true;
      user = this.userRepo.create({
        googleId: googleData.googleId,
        userName: googleData.name,
        userEmail: googleData.email,
        userImage: googleData.avatar,
        userAuthType: UserAuthType.GOOGLE,
        userRole: UserRole.STUDENT,
        userStatus: UserStatus.ACTIVE,
      });
      await this.userRepo.save(user);
    } else if (!user.userEmail && googleData.email) {
      user.userEmail = googleData.email;
      await this.userRepo.save(user);
    }

    const userGroups = await this.userGroupRepo.find({ where: { userId: user.id } });

    return {
      accessToken: this.generateToken(user, userGroups),
      user,
      groups: userGroups,
      isNewUser,
    };
  }

  // Google orqali ro'yxatdan o'tgan foydalanuvchi uchun parol o'rnatish
  async setGooglePassword(userId: string, password: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    if (password.length < 6) {
      throw new BadRequestException('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
    }

    user.userPassword = await bcrypt.hash(password, 10);
    await this.userRepo.save(user);

    return true;
  }

  // Email va parol bilan kirish
  async loginWithEmail(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { userEmail: email } });

    if (!user || !user.userPassword) {
      throw new UnauthorizedException('Email yoki parol noto\'g\'ri');
    }

    if (user.userStatus === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Hisobingiz bloklangan');
    }

    const isMatch = await bcrypt.compare(password, user.userPassword);
    if (!isMatch) {
      throw new UnauthorizedException('Email yoki parol noto\'g\'ri');
    }

    const userGroups = await this.userGroupRepo.find({ where: { userId: user.id } });

    return {
      accessToken: this.generateToken(user, userGroups),
      user,
      groups: userGroups,
      isNewUser: false,
    };
  }

  // Parolni tiklash so'rovi — email orqali token yuborish
  async requestPasswordReset(email: string) {
    const user = await this.userRepo.findOne({ where: { userEmail: email } });

    // Xavfsizlik uchun user topilmasa ham muvaffaqiyatli qaytaramiz
    if (!user) return true;

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 soat

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    await this.userRepo.save(user);

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    await this.sendEmail(
      email,
      'Parolni tiklash — Saidxonov Academy',
      `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1d4ed8;">Parolni tiklash</h2>
          <p>Saidxonov Academy akkauntingiz uchun parolni tiklash so'rovi yuborildi.</p>
          <p>Quyidagi tugmani bosing (havola 1 soat ichida amal qiladi):</p>
          <a href="${resetLink}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
            Parolni tiklash
          </a>
          <p style="color:#888;font-size:12px;">Agar siz bu so'rovni yubormagan bo'lsangiz, ushbu xabarni e'tiborsiz qoldiring.</p>
        </div>
      `,
    );

    return true;
  }

  // Yangi parol o'rnatish
  async resetPassword(token: string, newPassword: string) {
    const user = await this.userRepo.findOne({
      where: { resetPasswordToken: token },
    });

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Token yaroqsiz yoki muddati o\'tgan');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
    }

    user.userPassword = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepo.save(user);

    return true;
  }

  // Parolni o'zgartirish (profil sahifasidan)
  async changePassword(userId: string, currentPassword: string | undefined, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    if (newPassword.length < 6) {
      throw new BadRequestException('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
    }

    if (user.userPassword) {
      if (!currentPassword) {
        throw new BadRequestException('Joriy parolni kiriting');
      }
      const isMatch = await bcrypt.compare(currentPassword, user.userPassword);
      if (!isMatch) {
        throw new BadRequestException('Joriy parol noto\'g\'ri');
      }
    }

    user.userPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
    return true;
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
