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

interface RegisterWizardState {
  firstName?: string;
  lastName?: string;
  examPrepType?: TestType;
}

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
    this.bot = new Telegraf<BotContext>(configService.get<string>('TELEGRAM_BOT_TOKEN')!);
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
          "👋 Xush kelibsiz! Saidxonov Academy'ga ro'yxatdan o'tish uchun bir necha savolga javob bering.\n\nIsmingiz nima?",
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
        await ctx.reply('Familiyangiz nima?');
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

        const token = await this.finishRegistration(ctx, state);
        return this.replySuccess(ctx, token);
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
        await ctx.answerCbQuery();
        await ctx.editMessageReplyMarkup(undefined);

        const token = await this.finishRegistration(ctx, state, teacherCategory);
        return this.replySuccess(ctx, token);
      },
    );
  }

  private async finishRegistration(
    ctx: BotContext,
    state: RegisterWizardState,
    teacherCategory?: TeacherCategory,
  ): Promise<string> {
    return this.authService.registerViaTelegramBot({
      telegramId: String(ctx.from!.id),
      userName: state.firstName!,
      userLastName: state.lastName!,
      examPrepType: state.examPrepType!,
      teacherCategory,
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
