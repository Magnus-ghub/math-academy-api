import { ConfigService } from '@nestjs/config';

// Bot token muhitga qarab (dev/prod botlar alohida) — telegram-bot.service va
// auth.service'dagi bilan bir xil qoida.
export function getTelegramBotToken(config: ConfigService): string {
  return (
    process.env.NODE_ENV === 'production'
      ? config.get<string>('TELEGRAM_BOT_TOKEN_PROD')
      : config.get<string>('TELEGRAM_BOT_TOKEN_DEV')
  )!;
}

export interface TelegramApiResult<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

export async function callTelegram<T = any>(
  token: string,
  method: string,
  params: Record<string, string | number>,
): Promise<TelegramApiResult<T>> {
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}?${query}`);
  return res.json();
}
