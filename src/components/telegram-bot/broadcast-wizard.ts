import { Markup, Scenes } from 'telegraf';
import type { BroadcastService } from '../broadcast/broadcast.service';
import type { BroadcastRequest } from '../broadcast/broadcast.types';
import {
  BroadcastAudience,
  BroadcastMediaType,
} from 'src/libs/enums/broadcast.enum';

type BotContext = Scenes.WizardContext;

// Wizard holati: scene.enter('broadcast-wizard', { adminId }) bilan boshlanadi
interface BroadcastWizardState {
  adminId: string;
  request?: Omit<BroadcastRequest, 'audience'>;
  audience?: BroadcastAudience;
  groupId?: string;
  groupName?: string;
}

const AUDIENCE_LABELS: Record<string, string> = {
  [BroadcastAudience.ALL]: 'barcha foydalanuvchilar',
  [BroadcastAudience.STUDENTS]: "o'quvchilar",
  [BroadcastAudience.TEACHERS]: "o'qituvchilar",
};

const CANCEL_BUTTON = Markup.button.callback('❌ Bekor qilish', 'bc:cancel');

function callbackData(ctx: BotContext): string | null {
  return ctx.callbackQuery && 'data' in ctx.callbackQuery
    ? ctx.callbackQuery.data
    : null;
}

async function cancel(ctx: BotContext) {
  await ctx.answerCbQuery().catch(() => {});
  await ctx.editMessageText("❌ E'lon bekor qilindi.").catch(() => {});
  return ctx.scene.leave();
}

// Admin uchun bot ichidan e'lon yuborish: /elon → xabar (matn, rasm yoki
// video) → kimga → tasdiqlash. Yuborishning o'zi BroadcastService orqali,
// admin paneldagi bilan bir xil navbatda ketadi.
export function buildBroadcastWizard(
  broadcastService: BroadcastService,
): Scenes.WizardScene<BotContext> {
  return new Scenes.WizardScene<BotContext>(
    'broadcast-wizard',
    async (ctx) => {
      await ctx.reply(
        "📣 E'lon yuborish\n\n" +
          "E'lonni shu yerga yozing — oddiy matn, rasm yoki video (izohi bilan). " +
          'Qalin, kursiv, havola kabi formatlash saqlanadi.\n\n' +
          'Bekor qilish: /bekor',
      );
      return ctx.wizard.next();
    },

    // 1. E'lon tarkibini qabul qilish
    async (ctx) => {
      const msg = ctx.message;
      const state = ctx.wizard.state as BroadcastWizardState;
      if (!msg) return;

      if ('text' in msg) {
        state.request = { message: msg.text, entities: msg.entities ?? null };
      } else if ('photo' in msg) {
        state.request = {
          message: msg.caption ?? '',
          entities: msg.caption_entities ?? null,
          mediaType: BroadcastMediaType.PHOTO,
          // Eng katta o'lchamdagi variant oxirida turadi
          mediaFileId: msg.photo[msg.photo.length - 1].file_id,
        };
      } else if ('video' in msg) {
        state.request = {
          message: msg.caption ?? '',
          entities: msg.caption_entities ?? null,
          mediaType: BroadcastMediaType.VIDEO,
          mediaFileId: msg.video.file_id,
        };
      } else {
        await ctx.reply(
          'Faqat matn, rasm yoki video yuborish mumkin. Bekor qilish: /bekor',
        );
        return;
      }

      await ctx.reply(
        'Kimga yuboramiz?',
        Markup.inlineKeyboard([
          [
            Markup.button.callback('👥 Hammaga', 'bc:aud:ALL'),
            Markup.button.callback("🎓 O'quvchilar", 'bc:aud:STUDENTS'),
          ],
          [
            Markup.button.callback("👨‍🏫 O'qituvchilar", 'bc:aud:TEACHERS'),
            Markup.button.callback('📁 Guruhga', 'bc:aud:GROUP'),
          ],
          [CANCEL_BUTTON],
        ]),
      );
      return ctx.wizard.next();
    },

    // 2. Auditoriyani (kerak bo'lsa guruhni) tanlash
    async (ctx) => {
      const data = callbackData(ctx);
      const state = ctx.wizard.state as BroadcastWizardState;
      if (!data) {
        await ctx.reply('Tugmalardan birini tanlang yoki /bekor deb yozing.');
        return;
      }
      if (data === 'bc:cancel') return cancel(ctx);
      await ctx.answerCbQuery().catch(() => {});

      if (data === 'bc:aud:GROUP') {
        const groups = await broadcastService.getActiveGroups();
        if (!groups.length) {
          await ctx.editMessageText(
            "Faol guruhlar yo'q. Boshqa auditoriyani tanlang yoki /bekor deb yozing.",
          );
          return;
        }
        await ctx.editMessageText(
          'Qaysi guruhga?',
          Markup.inlineKeyboard([
            ...groups.map((g) => [
              Markup.button.callback(g.groupName, `bc:grp:${g.id}`),
            ]),
            [CANCEL_BUTTON],
          ]),
        );
        return;
      }

      if (data.startsWith('bc:grp:')) {
        state.audience = BroadcastAudience.GROUP;
        state.groupId = data.slice('bc:grp:'.length);
        const group = (await broadcastService.getActiveGroups()).find(
          (g) => g.id === state.groupId,
        );
        if (!group) {
          await ctx.editMessageText('Guruh topilmadi. /bekor deb yozing.');
          return;
        }
        state.groupName = group.groupName;
      } else if (data.startsWith('bc:aud:')) {
        const audience = data.slice('bc:aud:'.length) as BroadcastAudience;
        if (!(audience in AUDIENCE_LABELS)) return;
        state.audience = audience;
      } else {
        return;
      }

      const count = await broadcastService.countRecipients(
        state.adminId,
        state.audience,
        state.groupId,
      );
      const audienceText =
        state.audience === BroadcastAudience.GROUP
          ? `"${state.groupName}" guruhi a'zolari`
          : AUDIENCE_LABELS[state.audience];

      if (!count) {
        await ctx.editMessageText(
          `Tanlangan auditoriyada (${audienceText}) Telegram bog'langan foydalanuvchi yo'q. /bekor deb yozing.`,
        );
        return;
      }

      await ctx.editMessageText(
        `📣 Yuqoridagi e'lon ${audienceText}ga yuboriladi — ${count} ta foydalanuvchi.\n\n` +
          "Yuborilgan xabarni qaytarib bo'lmaydi. Tasdiqlaysizmi?",
        Markup.inlineKeyboard([
          [Markup.button.callback('✅ Yuborish', 'bc:send'), CANCEL_BUTTON],
        ]),
      );
      return ctx.wizard.next();
    },

    // 3. Tasdiqlash
    async (ctx) => {
      const data = callbackData(ctx);
      const state = ctx.wizard.state as BroadcastWizardState;
      if (!data) {
        await ctx.reply('Tugmalardan birini tanlang yoki /bekor deb yozing.');
        return;
      }
      if (data === 'bc:cancel') return cancel(ctx);
      if (data !== 'bc:send' || !state.request || !state.audience) return;
      await ctx.answerCbQuery().catch(() => {});

      try {
        const broadcast = await broadcastService.startBroadcast(state.adminId, {
          ...state.request,
          audience: state.audience,
          groupId: state.groupId,
        });
        await ctx.editMessageText(
          `⏳ E'lon ${broadcast.total} ta foydalanuvchiga yuborilmoqda. Tugagach hisobot yuboraman.`,
        );
      } catch (err) {
        await ctx.editMessageText(
          `❌ ${err instanceof Error ? err.message : 'Xatolik yuz berdi'}`,
        );
      }
      return ctx.scene.leave();
    },
  );
}
