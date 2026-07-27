import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserEntity, UserDocument } from 'src/schema/User.model';
import { GroupEntity, GroupDocument } from 'src/schema/Group.model';
import { UserGroupEntity, UserGroupDocument } from 'src/schema/User_Group.model';
import { TeacherCategory, UserAuthType, UserRole, UserStatus } from 'src/libs/enums/user.enum';
import { GroupStatus } from 'src/libs/enums/group.enum';
import { TestType } from 'src/libs/enums/test.enum';
import { RebindService } from './rebind.service';

@Injectable()
export class AuthService {
  private botUsernameCache: string | null = null;

  constructor(
    @InjectModel(UserEntity.name)
    private userModel: Model<UserDocument>,

    @InjectModel(GroupEntity.name)
    private groupModel: Model<GroupDocument>,

    @InjectModel(UserGroupEntity.name)
    private userGroupModel: Model<UserGroupDocument>,

    private jwtService: JwtService,
    private config: ConfigService,
    private rebindService: RebindService,
  ) {}

  private getTelegramBotToken(): string {
    return (
      process.env.NODE_ENV === 'production'
        ? this.config.get<string>('TELEGRAM_BOT_TOKEN_PROD')
        : this.config.get<string>('TELEGRAM_BOT_TOKEN_DEV')
    )!;
  }

  private async getBotUsername(): Promise<string> {
    if (this.botUsernameCache) return this.botUsernameCache;
    const res = await fetch(`https://api.telegram.org/bot${this.getTelegramBotToken()}/getMe`);
    const data = await res.json();
    this.botUsernameCache = data.result.username;
    return this.botUsernameCache!;
  }

  private generateToken(user: UserDocument, groups: UserGroupDocument[]) {
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

    const secretKey = crypto.createHash('sha256').update(this.getTelegramBotToken()).digest();

    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataString)
      .digest('hex');

    return expectedHash === hash;
  }

  private async checkTelegramGroups(telegramId: string): Promise<GroupDocument[]> {
    const groups = await this.groupModel.find({ groupStatus: GroupStatus.ACTIVE });
    const botToken = this.getTelegramBotToken();

    // Guruhlar soni ko'p bo'lganda (10+) ketma-ket so'rov yuborish login'ni
    // sekinlashtiradi — shuning uchun barcha guruhlarni parallel tekshiramiz.
    const results = await Promise.allSettled(
      groups.map(async (group) => {
        const res = await fetch(
          `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${group.telegramChatId}&user_id=${telegramId}`,
        );
        const data = await res.json();
        if (!['member', 'administrator', 'creator'].includes(data.result?.status)) {
          throw new Error('not a member');
        }
        return group;
      }),
    );

    const memberGroups: GroupDocument[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') memberGroups.push(r.value);
    }
    return memberGroups;
  }

  private async syncUserGroups(user: UserDocument, memberGroups: GroupDocument[]) {
    await this.userGroupModel.deleteMany({ userId: user.id });

    for (const group of memberGroups) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + group.durationMonths);
      await this.userGroupModel.create({
        userId: user.id,
        groupId: group.id,
        groupType: group.groupType,
        expiresAt,
      });
    }

    const saved = await this.userGroupModel.find({ userId: user.id });
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

    let user = await this.userModel.findOne({ telegramId: telegramData.telegramId });

    if (!user) {
      user = await this.userModel.create({
        telegramId: telegramData.telegramId,
        userName: telegramData.userName,
        userLastName: telegramData.userLastName,
        userImage: telegramData.userImage,
        userAuthType: UserAuthType.TELEGRAM,
        userRole: UserRole.STUDENT,
        userStatus: UserStatus.ACTIVE,
      });
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
      if (changed) await user.save();
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

  // Telegram bot orqali ro'yxatdan o'tish/kirish uchun qisqa muddatli token
  generateBotSignupToken(telegramId: string): string {
    return this.jwtService.sign(
      { telegramId, purpose: 'bot-login' },
      { expiresIn: '5m' },
    );
  }

  // Bot ichidagi forma to'ldirilgach yoki /login buyrug'ida chaqiriladi
  async registerViaTelegramBot(data: {
    telegramId: string;
    userName: string;
    userLastName: string;
    examPrepType: TestType;
    teacherCategory?: TeacherCategory;
    userPhone: string;
    userRegion: string;
    userDistrict: string;
  }): Promise<string> {
    let user = await this.userModel.findOne({ telegramId: data.telegramId });

    if (!user) {
      user = await this.userModel.create({
        telegramId: data.telegramId,
        userName: data.userName,
        userLastName: data.userLastName,
        userAuthType: UserAuthType.TELEGRAM,
        userRole: UserRole.STUDENT,
        userStatus: UserStatus.ACTIVE,
        examPrepType: data.examPrepType,
        teacherCategory: data.teacherCategory ?? null,
        userPhone: data.userPhone,
        userRegion: data.userRegion,
        userDistrict: data.userDistrict,
      });
    } else {
      user.userName = data.userName;
      user.userLastName = data.userLastName;
      user.examPrepType = data.examPrepType;
      user.teacherCategory = data.teacherCategory ?? null;
      user.userPhone = data.userPhone;
      user.userRegion = data.userRegion;
      user.userDistrict = data.userDistrict;
      await user.save();
    }

    return this.generateBotSignupToken(data.telegramId);
  }

  // Bot bergan qisqa muddatli tokenni to'liq sessiyaga almashtirish
  async telegramBotLogin(token: string) {
    let payload: { telegramId: string; purpose: string };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token yaroqsiz yoki muddati o\'tgan');
    }

    if (payload.purpose !== 'bot-login') {
      throw new UnauthorizedException('Invalid token');
    }

    return this.loginTelegramUser(payload.telegramId);
  }

  // Telegram ID orqali to'liq sessiya yaratish — telegramBotLogin va QR-login
  // (qr-login.service.ts) ikkalasi ham shu metoddan foydalanadi.
  async loginTelegramUser(telegramId: string) {
    const user = await this.userModel.findOne({ telegramId });
    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    const memberGroups = await this.checkTelegramGroups(telegramId);
    const userGroups = await this.syncUserGroups(user, memberGroups);

    return {
      accessToken: this.generateToken(user, userGroups),
      user,
      groups: userGroups,
      isNewUser: false,
    };
  }

  // Admin tomonidan hisobni tiklash uchun qo'lda login havolasi yaratish
  async adminGenerateLoginLink(userId: string): Promise<string> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (!user.telegramId) {
      throw new BadRequestException('Bu foydalanuvchida Telegram ID yo\'q');
    }

    const token = this.generateBotSignupToken(user.telegramId);
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    return `${frontendUrl}/telegram?token=${token}`;
  }

  // Telegram akkaunti o'chib ketgan (yoki yo'q) foydalanuvchi uchun — admin bu havolani
  // beradi, user uni O'ZINING YANGI Telegram akkauntidan ochib botga /start bosadi,
  // shunda telegramId eskisi o'rniga shu yangi akkauntga almashtiriladi.
  async adminGenerateRebindLink(userId: string): Promise<string> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const code = this.rebindService.create(user.id);
    const botUsername = await this.getBotUsername();
    return `https://t.me/${botUsername}?start=rebind_${code}`;
  }

  // Bot /start rebind_<code> qabul qilganda chaqiriladi — ctx.from.id orqali
  // kelgan yangi telegramId ni shu kodga bog'langan userga yozadi
  async confirmRebind(code: string, newTelegramId: string): Promise<UserDocument> {
    const userId = this.rebindService.consume(code);
    if (!userId) {
      throw new BadRequestException('Havola muddati o\'tgan yoki noto\'g\'ri');
    }

    const conflictUser = await this.userModel.findOne({ telegramId: newTelegramId });
    if (conflictUser && conflictUser.id !== userId) {
      throw new BadRequestException('Bu Telegram akkaunt allaqachon boshqa foydalanuvchiga bog\'langan');
    }

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    user.telegramId = newTelegramId;
    await user.save();
    return user;
  }

  // Google login/register — email saqlaydi, yangi foydalanuvchi bo'lsa isNewUser=true
  async googleLogin(googleData: {
    googleId: string;
    name: string;
    email: string;
    avatar?: string;
  }) {
    let isNewUser = false;

    let user = await this.userModel.findOne({ googleId: googleData.googleId });

    if (!user && googleData.email) {
      user = await this.userModel.findOne({ userEmail: googleData.email });
      if (user) {
        // Mavjud email bilan topildi — googleId ni bog'laymiz
        user.googleId = googleData.googleId;
        if (!user.userImage && googleData.avatar) user.userImage = googleData.avatar;
        await user.save();
      }
    }

    if (!user) {
      isNewUser = true;
      user = await this.userModel.create({
        googleId: googleData.googleId,
        userName: googleData.name,
        userEmail: googleData.email,
        userImage: googleData.avatar,
        userAuthType: UserAuthType.GOOGLE,
        userRole: UserRole.STUDENT,
        userStatus: UserStatus.ACTIVE,
      });
    } else if (!user.userEmail && googleData.email) {
      user.userEmail = googleData.email;
      await user.save();
    }

    const userGroups = await this.userGroupModel.find({ userId: user.id });

    return {
      accessToken: this.generateToken(user, userGroups),
      user,
      groups: userGroups,
      isNewUser,
    };
  }

  // Google orqali ro'yxatdan o'tgan foydalanuvchi uchun parol o'rnatish
  async setGooglePassword(userId: string, password: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    if (password.length < 6) {
      throw new BadRequestException('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
    }

    user.userPassword = await bcrypt.hash(password, 10);
    await user.save();

    return true;
  }

  // Email va parol bilan kirish
  async loginWithEmail(email: string, password: string) {
    const user = await this.userModel.findOne({ userEmail: email });

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

    const userGroups = await this.userGroupModel.find({ userId: user.id });

    return {
      accessToken: this.generateToken(user, userGroups),
      user,
      groups: userGroups,
      isNewUser: false,
    };
  }

  // Parolni tiklash so'rovi — email orqali token yuborish
  async requestPasswordReset(email: string) {
    const user = await this.userModel.findOne({ userEmail: email });

    // Xavfsizlik uchun user topilmasa ham muvaffaqiyatli qaytaramiz
    if (!user) return true;

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 soat

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    await user.save();

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
    const user = await this.userModel.findOne({ resetPasswordToken: token });

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Token yaroqsiz yoki muddati o\'tgan');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
    }

    user.userPassword = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return true;
  }

  // Parolni o'zgartirish (profil sahifasidan)
  async changePassword(userId: string, currentPassword: string | undefined, newPassword: string) {
    const user = await this.userModel.findById(userId);
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
    await user.save();
    return true;
  }

  // Guruhlar faqat login vaqtida hisoblanadi — foydalanuvchi kanalga
  // qo'shilgach qayta to'liq login qilmasdan ham yangilay olishi uchun
  // (profil sahifasidagi "Guruhlarni yangilash" tugmasi shu yerdan chaqiradi).
  async refreshMyGroups(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (!user.telegramId) {
      throw new BadRequestException('Telegram hisobi ulanmagan');
    }

    const memberGroups = await this.checkTelegramGroups(user.telegramId);
    const userGroups = await this.syncUserGroups(user, memberGroups);

    return {
      accessToken: this.generateToken(user, userGroups),
      user,
      groups: userGroups,
    };
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
