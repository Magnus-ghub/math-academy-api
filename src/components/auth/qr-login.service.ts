import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';

const SESSION_TTL_MS = 3 * 60 * 1000; // 3 daqiqa

type QrSessionStatus = 'PENDING' | 'CONFIRMED';

interface QrSession {
  status: QrSessionStatus;
  expiresAt: number;
  // AuthResponse GraphQL DTO'siga to'liq mos kelmasligi mumkin (Mongoose document
  // shakli) — auth.resolver.ts checkQrSession'da bo'sh maydonlar bilan qaytariladi.
  result?: any;
}

@Injectable()
export class QrLoginService {
  private sessions = new Map<string, QrSession>();

  constructor(private authService: AuthService) {}

  createSession(): string {
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.sessions.set(sessionId, { status: 'PENDING', expiresAt: Date.now() + SESSION_TTL_MS });
    return sessionId;
  }

  // Bot /start qr_<sessionId> qabul qilganda chaqiradi
  async confirmSession(
    sessionId: string,
    telegramId: string,
  ): Promise<'OK' | 'NOT_REGISTERED' | 'NOT_FOUND'> {
    const session = this.getSession(sessionId);
    if (!session) return 'NOT_FOUND';

    try {
      const result = await this.authService.loginTelegramUser(telegramId);
      this.sessions.set(sessionId, { status: 'CONFIRMED', expiresAt: session.expiresAt, result });
      return 'OK';
    } catch {
      return 'NOT_REGISTERED';
    }
  }

  // Frontend polling uchun — eskirgan sessiyalarni lazy tozalaydi
  getSession(sessionId: string): QrSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session;
  }
}
