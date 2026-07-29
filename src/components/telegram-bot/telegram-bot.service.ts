import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Telegraf, Markup, Scenes, session } from 'telegraf';
import { AuthService } from '../auth/auth.service';
import { QrLoginService } from '../auth/qr-login.service';
import { UserEntity, UserDocument } from 'src/schema/User.model';
import { TeacherCategory } from 'src/libs/enums/user.enum';
import { TestType } from 'src/libs/enums/test.enum';
import { UZBEKISTAN_REGIONS, findRegionByCode } from 'src/libs/constants/uzbekistan-regions';

interface RegisterWizardState {
  firstName?: string;
  lastName?: string;
  examPrepType?: TestType;
  teacherCategory?: TeacherCategory;
  regionCode?: string;
  region?: string;
  district?: string;
}

// REGION_STEP — viloyat so'raladigan qadam indeksi, ATTESTATSIYA bo'lmagan
// yo'nalishlarda toifa qadamini o'tkazib, to'g'ridan-to'g'ri shu qadamga sakraymiz.
// Telefon raqami endi bot orqali so'ralmaydi — foydalanuvchi buni keyinchalik
// profil sahifasida (dashboard/profile) o'zi to'ldiradi, wizard qisqaroq bo'lishi uchun.
const REGION_STEP = 5;

type BotContext = Scenes.WizardContext;

const EXAM_LABELS: Record<TestType, string> = {
  [TestType.DTM]: 'DTM',
  [TestType.SAT]: 'SAT',
  [TestType.MILLIY_SERTIFIKAT]: 'Milliy sertifikat',
  [TestType.ATTESTATSIYA]: 'Attestatsiya',
};

const TOIFA_LABELS: Record<TeacherCategory, string> = {
  [TeacherCategory.MUTAXASSIS]: 'Mutaxassis toifasi',
  [TeacherCategory.IKKINCHI_TOIFA]: 'Ikkinchi toifa',
  [TeacherCategory.BIRINCHI_TOIFA]: 'Birinchi toifa',
  [TeacherCategory.OLIY_TOIFA]: 'Oliy toifa',
};

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf<BotContext>;

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private qrLoginService: QrLoginService,
    @InjectModel(UserEntity.name) private userModel: Model<UserDocument>,
  ) {
    const botToken =
      process.env.NODE_ENV === 'production'
        ? configService.get<string>('TELEGRAM_BOT_TOKEN_PROD')
        : configService.get<string>('TELEGRAM_BOT_TOKEN_DEV');
    this.bot = new Telegraf<BotContext>(botToken!);
  }

  async onModuleInit() {
    const stage = new Scenes.Stage<BotContext>([this.buildRegisterWizard()]);
    this.bot.use(session());
    this.bot.use(stage.middleware());
    this.registerCommands();
    this.bot.catch((err, ctx) => {
      console.error(`Bot error for update ${ctx.updateType}:`, err);
      ctx
        .reply("❌ Xatolik yuz berdi. Iltimos, /start orqali qaytadan urinib ko'ring.")
        .catch(() => {});
      ctx.scene?.leave().catch(() => {});
    });
    this.bot.launch().catch((err) => console.error('Bot launch error:', err));
    console.log('✅ Telegram bot started');
  }

  async onModuleDestroy() {
    this.bot.stop('SIGTERM');
  }

  private registerCommands() {
    this.bot.start(async (ctx) => {
      const payload = ctx.startPayload;

      if (payload === 'register') {
        const existing = await this.userModel.findOne({ telegramId: String(ctx.from.id) });
        if (existing) {
          return this.replyWithLoginLink(
            ctx,
            `Xush kelibsiz qaytganingizdan xursandmiz, ${existing.userName}! 👋\nSiz allaqachon ro'yxatdan o'tgansiz.`,
          );
        }
        return ctx.scene.enter('register-wizard');
      }

      if (payload?.startsWith('qr_')) {
        return this.handleQrLogin(ctx, payload.slice(3));
      }

      if (payload?.startsWith('rebind_')) {
        return this.handleRebind(ctx, payload.slice('rebind_'.length));
      }

      return ctx.reply(
        `Salom, ${ctx.from.first_name}! 👋\n\n🎯 *Saidxonov Academy Bot*\n\n` +
          `📝 /login — Platformaga kirish\n` +
          `❓ /help — Yordam`,
        { parse_mode: 'Markdown' },
      );
    });

    this.bot.command('login', async (ctx) => this.handleLoginRequest(ctx));

    this.bot.command('help', (ctx) =>
      ctx.reply(
        "❓ *Yordam*\n\n/login — Platformaga kirish\n/start register — Ro'yxatdan o'tish",
        { parse_mode: 'Markdown' },
      ),
    );
  }

  private buildRegisterWizard(): Scenes.WizardScene<BotContext> {
    return new Scenes.WizardScene<BotContext>(
      'register-wizard',
      async (ctx) => {
        await ctx.reply(
          "👋 Xush kelibsiz! Saidxonov Academy'ga ro'yxatdan o'tish uchun bir necha savolga javob bering.\n\nIsmingiz nima?\nMisol uchun: Aziz",
        );
        return ctx.wizard.next();
      },
      async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
          await ctx.reply("Iltimos, ismingizni matn ko'rinishida yozing.");
          return;
        }
        const firstName = ctx.message.text.trim();
        if (!firstName || firstName.length > 50) {
          await ctx.reply("Ism noto'g'ri ko'rinmoqda. Qaytadan urinib ko'ring:");
          return;
        }
        (ctx.wizard.state as RegisterWizardState).firstName = firstName;
        await ctx.reply("Familiyangiz nima?\nMisol uchun: Aliyev");
        return ctx.wizard.next();
      },
      async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
          await ctx.reply("Iltimos, familiyangizni matn ko'rinishida yozing.");
          return;
        }
        const lastName = ctx.message.text.trim();
        if (!lastName || lastName.length > 50) {
          await ctx.reply("Familiya noto'g'ri ko'rinmoqda. Qaytadan urinib ko'ring:");
          return;
        }
        (ctx.wizard.state as RegisterWizardState).lastName = lastName;
        await ctx.reply(
          'Qaysi imtihonga tayyorlanasiz?',
          Markup.inlineKeyboard(
            Object.values(TestType).map((type) =>
              Markup.button.callback(EXAM_LABELS[type], `exam_${type}`),
            ),
            { columns: 2 },
          ),
        );
        return ctx.wizard.next();
      },
      async (ctx) => {
        const data =
          ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;

        if (!data || !data.startsWith('exam_')) {
          await ctx.reply('Iltimos, tugmalardan birini tanlang.');
          return;
        }

        const examPrepType = data.replace('exam_', '') as TestType;
        const state = ctx.wizard.state as RegisterWizardState;
        state.examPrepType = examPrepType;
        await ctx.answerCbQuery();
        await ctx.editMessageReplyMarkup(undefined);

        if (examPrepType === TestType.ATTESTATSIYA) {
          await ctx.reply(
            'Hozirgi toifangiz?',
            Markup.inlineKeyboard(
              Object.values(TeacherCategory).map((category) =>
                Markup.button.callback(TOIFA_LABELS[category], `toifa_${category}`),
              ),
              { columns: 2 },
            ),
          );
          return ctx.wizard.next();
        }

        await this.askRegion(ctx);
        return ctx.wizard.selectStep(REGION_STEP);
      },
      async (ctx) => {
        const data =
          ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;

        if (!data || !data.startsWith('toifa_')) {
          await ctx.reply('Iltimos, tugmalardan birini tanlang.');
          return;
        }

        const teacherCategory = data.replace('toifa_', '') as TeacherCategory;
        const state = ctx.wizard.state as RegisterWizardState;
        state.teacherCategory = teacherCategory;
        await ctx.answerCbQuery();
        await ctx.editMessageReplyMarkup(undefined);

        await this.askRegion(ctx);
        return ctx.wizard.next();
      },
      async (ctx) => {
        const data =
          ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;

        const code = data?.startsWith('reg_') ? data.replace('reg_', '') : undefined;
        const region = code ? findRegionByCode(code) : undefined;

        if (!region) {
          await ctx.reply('Iltimos, tugmalardan birini tanlang.');
          return;
        }

        const state = ctx.wizard.state as RegisterWizardState;
        state.regionCode = region.code;
        state.region = region.name;
        await ctx.answerCbQuery();
        await ctx.editMessageReplyMarkup(undefined);

        await ctx.reply(
          'Qaysi tumandasiz?',
          Markup.inlineKeyboard(
            region.districts.map((d, i) =>
              Markup.button.callback(d.name, `dist_${region.code}_${i}`),
            ),
            { columns: 2 },
          ),
        );
        return ctx.wizard.next();
      },
      async (ctx) => {
        const data =
          ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
        const state = ctx.wizard.state as RegisterWizardState;
        const region = state.regionCode ? findRegionByCode(state.regionCode) : undefined;

        const prefix = region ? `dist_${region.code}_` : undefined;
        const index = data && prefix && data.startsWith(prefix)
          ? Number(data.slice(prefix.length))
          : NaN;
        const district = region && !Number.isNaN(index) ? region.districts[index] : undefined;

        if (!district) {
          await ctx.reply('Iltimos, tugmalardan birini tanlang.');
          return;
        }

        state.district = district.name;
        await ctx.answerCbQuery();
        await ctx.editMessageReplyMarkup(undefined);

        const token = await this.finishRegistration(ctx, state);
        return this.replySuccess(ctx, token);
      },
    );
  }

  private async askRegion(ctx: BotContext) {
    await ctx.reply(
      'Qaysi viloyatdasiz?',
      Markup.inlineKeyboard(
        UZBEKISTAN_REGIONS.map((r) => Markup.button.callback(r.name, `reg_${r.code}`)),
        { columns: 2 },
      ),
    );
  }

  private async finishRegistration(
    ctx: BotContext,
    state: RegisterWizardState,
  ): Promise<string> {
    return this.authService.registerViaTelegramBot({
      telegramId: String(ctx.from!.id),
      userName: state.firstName!,
      userLastName: state.lastName!,
      examPrepType: state.examPrepType!,
      teacherCategory: state.teacherCategory,
      userRegion: state.region!,
      userDistrict: state.district!,
    });
  }

  private async replySuccess(ctx: BotContext, token: string) {
    await this.sendLoginLink(ctx, "✅ Ro'yxatdan o'tish yakunlandi!", token);
    return ctx.scene.leave();
  }

  private async handleQrLogin(ctx: BotContext, sessionId: string) {
    const result = await this.qrLoginService.confirmSession(sessionId, String(ctx.from!.id));

    if (result === 'NOT_FOUND') {
      return ctx.reply("⚠️ QR kod muddati tugagan. Sahifani yangilab, qaytadan urinib ko'ring.");
    }

    if (result === 'NOT_REGISTERED') {
      const botUsername = ctx.botInfo?.username;
      return ctx.reply(
        "Siz hali ro'yxatdan o'tmagansiz.\n\nAvval ro'yxatdan o'ting, so'ng QR kodni qayta skanerlang:",
        botUsername
          ? Markup.inlineKeyboard([
              Markup.button.url(
                "📝 Ro'yxatdan o'tish",
                `https://t.me/${botUsername}?start=register`,
              ),
            ])
          : undefined,
      );
    }

    return ctx.reply('✅ Tasdiqlandi! Kompyuteringizga qaytib, avtomatik kirasiz.');
  }

  // Report (e'tiroz) admin tomonidan hal/rad etilganda talabaga xabar yuborish
  // uchun — report.service.ts shu metodni chaqiradi.
  async notifyUser(telegramId: string, message: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const url = frontendUrl ? `${frontendUrl}/dashboard/reports` : undefined;
    const buttonUrl = url?.replace('://localhost', '://127.0.0.1');
    const canUseButton = buttonUrl && (buttonUrl.startsWith('https://') || buttonUrl.includes('://127.0.0.1'));

    try {
      await this.bot.telegram.sendMessage(
        telegramId,
        message,
        {
          parse_mode: 'HTML',
          ...(canUseButton
            ? { reply_markup: Markup.inlineKeyboard([Markup.button.url("📋 Mening e'tirozlarim", buttonUrl!)]).reply_markup }
            : {}),
        },
      );
    } catch (err) {
      // User botni bloklagan yoki /start bosmagan bo'lishi mumkin — bu
      // ilovaning boshqa qismini to'xtatmasligi kerak
      console.error(`Telegram xabar yuborilmadi (telegramId=${telegramId}):`, err);
    }
  }

  private async handleRebind(ctx: BotContext, code: string) {
    let user: UserDocument;
    try {
      user = await this.authService.confirmRebind(code, String(ctx.from!.id));
    } catch (err) {
      return ctx.reply(`❌ ${err instanceof Error ? err.message : 'Xatolik yuz berdi'}`);
    }
    return this.replyWithLoginLink(
      ctx,
      `✅ Hisobingiz ushbu Telegram akkauntga muvaffaqiyatli bog'landi, ${user.userName}!\n\nPlatformaga kirish:`,
    );
  }

  private async handleLoginRequest(ctx: BotContext) {
    const user = await this.userModel.findOne({ telegramId: String(ctx.from!.id) });
    if (!user) {
      const botUsername = ctx.botInfo?.username;
      return ctx.reply(
        "Siz hali ro'yxatdan o'tmagansiz.\n\nRo'yxatdan o'tish uchun quyidagi tugmani bosing:",
        botUsername
          ? Markup.inlineKeyboard([
              Markup.button.url(
                "📝 Ro'yxatdan o'tish",
                `https://t.me/${botUsername}?start=register`,
              ),
            ])
          : undefined,
      );
    }
    return this.replyWithLoginLink(ctx, '🔐 Platformaga kirish:');
  }

  private async replyWithLoginLink(ctx: BotContext, message: string) {
    const token = this.authService.generateBotSignupToken(String(ctx.from!.id));
    return this.sendLoginLink(ctx, message, token);
  }

  // Telegram inline tugma "localhost" nomini domen sifatida rad etadi ("Wrong HTTP
  // URL"), lekin xuddi shu mashinaga ishora qiluvchi 127.0.0.1'ni qabul qiladi —
  // shuning uchun tugma uchun manzilni shunga moslab almashtiramiz.
  private async sendLoginLink(ctx: BotContext, message: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL')!;
    const url = `${frontendUrl}/telegram?token=${token}`;
    const buttonUrl = url.replace('://localhost', '://127.0.0.1');
    const canUseButton = buttonUrl.startsWith('https://') || buttonUrl.includes('://127.0.0.1');

    if (canUseButton) {
      return ctx.reply(
        message,
        Markup.inlineKeyboard([Markup.button.url("🎓 Saidxonov Academy'ga kirish", buttonUrl)]),
      );
    }
    return ctx.reply(`${message}\n${url}`);
  }
}
