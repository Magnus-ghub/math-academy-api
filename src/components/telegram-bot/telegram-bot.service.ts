import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Telegraf, Markup, Scenes, session } from 'telegraf';
import { AuthService } from '../auth/auth.service';
import { QrLoginService } from '../auth/qr-login.service';
import { ResultsService } from '../results/results.service';
import { TelegramChatsService } from '../groups/telegram-chats.service';
import { UserEntity, UserDocument } from 'src/schema/User.model';
import { TeacherCategory, UserRole } from 'src/libs/enums/user.enum';
import { BroadcastMediaType } from 'src/libs/enums/broadcast.enum';
import { BroadcastService } from '../broadcast/broadcast.service';
import type { BroadcastPayload } from '../broadcast/broadcast.types';
import { buildBroadcastWizard } from './broadcast-wizard';
import { TestType } from 'src/libs/enums/test.enum';
import { UZBEKISTAN_REGIONS, findRegionByCode } from 'src/libs/constants/uzbekistan-regions';
import { normalizePersonName } from 'src/libs/utils/personName.util';

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

const PUBLIC_COMMANDS = [
  { command: 'login', description: '🎓 Academyga kirish' },
  { command: 'register', description: "📝 Ro'yxatdan o'tish" },
  { command: 'results', description: '📊 Mening natijalarim' },
  { command: 'help', description: '❓ Yordam' },
];

// Adminlar menyusida qo'shimcha ko'rinadigan buyruqlar
const ADMIN_COMMANDS = [
  ...PUBLIC_COMMANDS,
  { command: 'elon', description: "📣 E'lon yuborish (admin)" },
];

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf<BotContext>;

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private qrLoginService: QrLoginService,
    private resultsService: ResultsService,
    private telegramChatsService: TelegramChatsService,
    @InjectModel(UserEntity.name) private userModel: Model<UserDocument>,
    // BroadcastService ham shu servisdan foydalanadi — aylanma bog'liqlik
    @Inject(forwardRef(() => BroadcastService))
    private broadcastService: BroadcastService,
  ) {
    const botToken =
      process.env.NODE_ENV === 'production'
        ? configService.get<string>('TELEGRAM_BOT_TOKEN_PROD')
        : configService.get<string>('TELEGRAM_BOT_TOKEN_DEV');
    this.bot = new Telegraf<BotContext>(botToken!);
  }

  async onModuleInit() {
    const stage = new Scenes.Stage<BotContext>([
      this.buildRegisterWizard(),
      buildBroadcastWizard(this.broadcastService),
    ]);
    // session/stage'dan OLDIN — kanal postlarida "from" yo'q, session esa
    // bunday yangilanishlarda xato beradi.
    this.registerChatTracking();
    this.bot.use(session());
    // Ro'yxatdan o'tish jarayonida yuborilgan buyruq (/start, /register,
    // QR-login havolasi va h.k.) ism/familiya sifatida saqlanib qolmasligi
    // uchun — wizard tashlab yuboriladi va buyruq o'zining odatdagi
    // handler'iga o'tadi (/start, /register esa ro'yxatni boshidan boshlaydi).
    this.bot.use((ctx, next) => {
      const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
      if (text.startsWith('/') && ctx.session?.__scenes?.current) {
        ctx.session.__scenes = { cursor: 0 };
      }
      return next();
    });
    this.bot.use(stage.middleware());
    this.registerCommands();
    this.bot.catch((err, ctx) => {
      console.error(`Bot error for update ${ctx.updateType}:`, err);
      ctx
        .reply("❌ Xatolik yuz berdi. Iltimos, /start orqali qaytadan urinib ko'ring.")
        .catch(() => {});
      ctx.scene?.leave().catch(() => {});
    });
    await this.bot.telegram.setMyCommands(PUBLIC_COMMANDS);
    await this.syncAdminCommandMenus();
    this.bot.launch().catch((err) => console.error('Bot launch error:', err));
    console.log('✅ Telegram bot started');
  }

  // /elon oddiy foydalanuvchilar menyusida ko'rinmasligi uchun adminlarga
  // menyu har birining chati uchun alohida (scope: chat) o'rnatiladi
  private async syncAdminCommandMenus() {
    const admins = await this.userModel.find(
      { userRole: UserRole.ADMIN, telegramId: { $type: 'string' } },
      'telegramId',
    );
    await Promise.all(admins.map((a) => this.setAdminCommandMenu(a.telegramId!)));
  }

  private async setAdminCommandMenu(telegramId: string) {
    await this.bot.telegram
      .setMyCommands(ADMIN_COMMANDS, {
        scope: { type: 'chat', chat_id: Number(telegramId) },
      })
      .catch((err) =>
        console.error(`Admin menyusini o'rnatib bo'lmadi (telegramId=${telegramId}):`, err),
      );
  }

  async onModuleDestroy() {
    this.bot.stop('SIGTERM');
  }

  // Bot qaysi kanal/guruhlarda admin ekanini kuzatib boradi (admin panelda
  // guruh yaratishda chat ID o'rniga ro'yxatdan tanlash uchun).
  private registerChatTracking() {
    // Bot qo'shildi / admin qilindi / huquqi olindi / chiqarildi
    this.bot.on('my_chat_member', async (ctx) => {
      const { chat, from, new_chat_member } = ctx.myChatMember;
      if (chat.type === 'private') return;
      await this.telegramChatsService
        .trackChat({
          chatId: String(chat.id),
          title: chat.title,
          type: chat.type,
          username: 'username' in chat ? chat.username ?? null : null,
          botStatus: new_chat_member.status,
          addedByTelegramId: String(from.id),
          addedByName: [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username || null,
        })
        .catch((err) => console.error('trackChat error:', err));
    });

    // Bot qo'shilganidan oldin admin bo'lib qolgan (yangilanish kelmagan)
    // kanallar uchun: kanalga "/ulash" deb post yoziladi — bot kanalni
    // ro'yxatga qo'shadi va postni o'chiradi.
    this.bot.on('channel_post', async (ctx, next) => {
      const post = ctx.channelPost;
      if (!('text' in post) || !/^\/ulash(@\w+)?\s*$/i.test(post.text)) return next();
      await this.linkChatByCommand(ctx.chat);
      await ctx.deleteMessage().catch(() => {});
    });
  }

  private async linkChatByCommand(chat: { id: number; type: string; title?: string; username?: string }) {
    const chatId = String(chat.id);
    const status = await this.telegramChatsService.getBotStatus(chatId).catch(() => null);
    if (!status) return;
    await this.telegramChatsService.trackChat({
      chatId,
      title: chat.title ?? chatId,
      type: chat.type,
      username: chat.username ?? null,
      botStatus: status,
    });
  }

  private registerCommands() {
    this.bot.start(async (ctx) => {
      const payload = ctx.startPayload;

      if (payload === 'register') {
        return this.handleRegisterRequest(ctx);
      }

      if (payload?.startsWith('qr_')) {
        return this.handleQrLogin(ctx, payload.slice(3));
      }

      if (payload?.startsWith('rebind_')) {
        return this.handleRebind(ctx, payload.slice('rebind_'.length));
      }

      const isAdmin = await this.userModel.exists({
        telegramId: String(ctx.from.id),
        userRole: UserRole.ADMIN,
      });
      // Server ishlayotgan paytda admin qilingan foydalanuvchi ham /start
      // bosganda menyusida /elon paydo bo'lsin
      if (isAdmin) await this.setAdminCommandMenu(String(ctx.from.id));

      return ctx.reply(
        `Salom, ${ctx.from.first_name}! 👋\n\n🎯 *Saidxonov Academy Bot*\n\n` +
          `🎓 /login — Academyga kirish\n` +
          `📝 /register — Ro'yxatdan o'tish\n` +
          `📊 /results — Mening natijalarim\n` +
          `❓ /help — Yordam` +
          (isAdmin ? `\n\n👑 *Admin:*\n📣 /elon — E'lon yuborish` : ''),
        { parse_mode: 'Markdown' },
      );
    });

    this.bot.command('login', async (ctx) => this.handleLoginRequest(ctx));
    this.bot.command('elon', async (ctx) => this.handleBroadcastRequest(ctx));
    // Faol wizard'ni "/" bilan boshlangan har qanday xabar to'xtatadi
    // (onModuleInit'dagi middleware) — bu yerda faqat javob qaytaramiz.
    this.bot.command('bekor', (ctx) => ctx.reply('Bekor qilindi.'));
    // Wizard tugaganidan keyin eski e'lon tugmalari bosilsa
    this.bot.action(/^bc:/, (ctx) =>
      ctx.answerCbQuery("Bu e'lon allaqachon yakunlangan. Yangisi uchun /elon"),
    );
    this.bot.command('register', async (ctx) => this.handleRegisterRequest(ctx));
    this.bot.command('results', async (ctx) => this.handleMyResults(ctx));

    // Supergroup'da "/ulash" — kanaldagi post bilan bir xil (channel_post
    // handler'ga qarang). Shaxsiy chatda — qanday ulash haqida yo'riqnoma.
    this.bot.command('ulash', async (ctx) => {
      if (ctx.chat.type === 'private') {
        await ctx.reply(
          "Kanal yoki guruhni admin panelga ulash uchun:\n\n" +
            "1. Botni kanal/guruhga ADMIN qilib qo'shing.\n" +
            "2. Admin panel → Guruhlar → Yangi guruh — kanal ro'yxatda paydo bo'ladi.\n\n" +
            "Agar bot avvaldan admin bo'lsa-yu, ro'yxatda ko'rinmasa — kanal/guruhga /ulash deb yozing.",
        );
        return;
      }
      await this.linkChatByCommand(ctx.chat);
      await ctx.deleteMessage().catch(() => {});
    });

    this.bot.command('help', (ctx) =>
      ctx.reply(
        "❓ *Yordam*\n\n" +
          "🎓 /login — Academyga kirish\n" +
          "📝 /register — Ro'yxatdan o'tish\n" +
          "📊 /results — Mening natijalarim",
        { parse_mode: 'Markdown' },
      ),
    );
  }

  private async handleRegisterRequest(ctx: BotContext) {
    const existing = await this.userModel.findOne({ telegramId: String(ctx.from!.id) });
    if (existing) {
      return this.replyWithLoginLink(
        ctx,
        `Xush kelibsiz qaytganingizdan xursandmiz, ${existing.userName}! 👋\nSiz allaqachon ro'yxatdan o'tgansiz.`,
      );
    }
    return ctx.scene.enter('register-wizard');
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
        const firstName = normalizePersonName(ctx.message.text);
        if (!firstName.ok) {
          await ctx.reply(
            "Ism noto'g'ri ko'rinmoqda. Faqat harflardan foydalaning (2–30 belgi).\nMisol uchun: Aziz",
          );
          return;
        }
        (ctx.wizard.state as RegisterWizardState).firstName = firstName.value;
        await ctx.reply("Familiyangiz nima?\nMisol uchun: Aliyev");
        return ctx.wizard.next();
      },
      async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
          await ctx.reply("Iltimos, familiyangizni matn ko'rinishida yozing.");
          return;
        }
        const lastName = normalizePersonName(ctx.message.text);
        if (!lastName.ok) {
          await ctx.reply(
            "Familiya noto'g'ri ko'rinmoqda. Faqat harflardan foydalaning (2–30 belgi).\nMisol uchun: Aliyev",
          );
          return;
        }
        (ctx.wizard.state as RegisterWizardState).lastName = lastName.value;
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
      return this.replyNotRegistered(
        ctx,
        "Siz hali ro'yxatdan o'tmagansiz.\n\nAvval ro'yxatdan o'ting, so'ng QR kodni qayta skanerlang:",
      );
    }

    return ctx.reply('✅ Tasdiqlandi! Kompyuteringizga qaytib, avtomatik kirasiz.');
  }

  // Report (e'tiroz) admin tomonidan hal/rad etilganda talabaga xabar yuborish
  // uchun — report.service.ts shu metodni chaqiradi.
  async notifyUser(
    telegramId: string,
    message: string,
    button: { label: string; path: string } = {
      label: "📋 Mening e'tirozlarim",
      path: '/dashboard/reports',
    },
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const url = frontendUrl ? `${frontendUrl}${button.path}` : undefined;
    const buttonUrl = url?.replace('://localhost', '://127.0.0.1');
    const canUseButton = buttonUrl && (buttonUrl.startsWith('https://') || buttonUrl.includes('://127.0.0.1'));

    try {
      await this.bot.telegram.sendMessage(
        telegramId,
        message,
        {
          parse_mode: 'HTML',
          ...(canUseButton
            ? { reply_markup: Markup.inlineKeyboard([Markup.button.url(button.label, buttonUrl!)]).reply_markup }
            : {}),
        },
      );
    } catch (err) {
      // User botni bloklagan yoki /start bosmagan bo'lishi mumkin — bu
      // ilovaning boshqa qismini to'xtatmasligi kerak
      console.error(`Telegram xabar yuborilmadi (telegramId=${telegramId}):`, err);
    }
  }

  // Ommaviy e'lon uchun — notifyUser'dan farqli ravishda natijani qaytaradi
  // (statistika uchun) va Telegram limitga urilganda (429) aytilgan vaqtcha
  // kutib qayta urinadi. Matn HTML sifatida talqin qilinmaydi — formatlash
  // faqat entities orqali (bot ichida yozilgan e'lonlarda) keladi.
  async sendBroadcastMessage(
    telegramId: string,
    payload: BroadcastPayload,
  ): Promise<boolean> {
    const entities = payload.entities ?? undefined;
    const caption = payload.message || undefined;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (payload.mediaType === BroadcastMediaType.PHOTO) {
          await this.bot.telegram.sendPhoto(telegramId, payload.mediaFileId!, {
            caption,
            caption_entities: entities,
          });
        } else if (payload.mediaType === BroadcastMediaType.VIDEO) {
          await this.bot.telegram.sendVideo(telegramId, payload.mediaFileId!, {
            caption,
            caption_entities: entities,
            supports_streaming: true,
          });
        } else {
          await this.bot.telegram.sendMessage(telegramId, payload.message, {
            entities,
          });
        }
        return true;
      } catch (err) {
        const retryAfter = (
          err as { response?: { parameters?: { retry_after?: number } } }
        )?.response?.parameters?.retry_after;
        if (typeof retryAfter !== 'number') return false;
        await new Promise((resolve) => setTimeout(resolve, (retryAfter + 1) * 1000));
      }
    }
    return false;
  }

  // Admin paneldan yuklangan rasm/videoni Telegram serveriga joylab, file_id
  // oladi: fayl adminning o'z chatiga jim yuboriladi va darhol o'chiriladi.
  // file_id xabar o'chirilgandan keyin ham ishlaydi va barcha oluvchilarga
  // qayta ishlatiladi — fayl har bir foydalanuvchi uchun qayta yuklanmaydi.
  async uploadBroadcastMedia(
    chatId: string,
    mediaType: BroadcastMediaType,
    file: { buffer: Buffer; originalname: string },
  ): Promise<string> {
    const source = { source: file.buffer, filename: file.originalname };
    const sent =
      mediaType === BroadcastMediaType.PHOTO
        ? await this.bot.telegram.sendPhoto(chatId, source, {
            disable_notification: true,
          })
        : await this.bot.telegram.sendVideo(chatId, source, {
            disable_notification: true,
            supports_streaming: true,
          });
    await this.bot.telegram.deleteMessage(chatId, sent.message_id).catch(() => {});

    if ('photo' in sent) return sent.photo[sent.photo.length - 1].file_id;
    if ('video' in sent) return sent.video.file_id;
    // Telegram videoni tanimasa, uni hujjat sifatida saqlaydi
    throw new BadRequestException(
      "Telegram bu videoni qabul qilmadi — MP4 formatda yuklang",
    );
  }

  private async handleBroadcastRequest(ctx: BotContext) {
    if (ctx.chat?.type !== 'private') return;
    const admin = await this.userModel.findOne(
      { telegramId: String(ctx.from!.id), userRole: UserRole.ADMIN },
      '_id',
    );
    if (!admin) return ctx.reply("Bu buyruq faqat adminlar uchun.");
    return ctx.scene.enter('broadcast-wizard', { adminId: admin.id });
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
      return this.replyNotRegistered(
        ctx,
        "Siz hali ro'yxatdan o'tmagansiz.\n\nRo'yxatdan o'tish uchun quyidagi tugmani bosing:",
      );
    }
    return this.replyWithLoginLink(ctx, '🔐 Platformaga kirish:');
  }

  private async handleMyResults(ctx: BotContext) {
    const user = await this.userModel.findOne({ telegramId: String(ctx.from!.id) });
    if (!user) {
      return this.replyNotRegistered(
        ctx,
        "Siz hali ro'yxatdan o'tmagansiz.\n\nRo'yxatdan o'tish uchun quyidagi tugmani bosing:",
      );
    }

    const results = await this.resultsService.getMyResults(user.id);
    if (results.length === 0) {
      return ctx.reply("📭 Siz hali birorta ham test topshirmagansiz.");
    }

    const lines = results.slice(0, 5).map((r) => {
      const date = new Date(r.createdAt).toLocaleDateString('uz-UZ');
      const title = r.testTitle ?? 'Test';
      return `📄 *${title}*\n   ${Math.round(r.score)}% — ${r.correctAnswers}/${r.totalQuestions} to'g'ri — ${date}`;
    });

    return ctx.reply(`📊 *Oxirgi natijalaringiz:*\n\n${lines.join('\n\n')}`, {
      parse_mode: 'Markdown',
    });
  }

  private replyNotRegistered(ctx: BotContext, intro: string) {
    const botUsername = ctx.botInfo?.username;
    return ctx.reply(
      intro,
      botUsername
        ? Markup.inlineKeyboard([
            Markup.button.url("📝 Ro'yxatdan o'tish", `https://t.me/${botUsername}?start=register`),
          ])
        : undefined,
    );
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
