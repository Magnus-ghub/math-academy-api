import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

const REBIND_TTL_MS = 24 * 60 * 60 * 1000; // 24 soat — admin havolani yuborishi va user yangi
// Telegram akkauntini ochib botga /start bosishi uchun QR-loginga qaraganda ko'proq vaqt kerak

interface RebindRequest {
  userId: string;
  expiresAt: number;
}

@Injectable()
export class RebindService {
  private requests = new Map<string, RebindRequest>();

  create(userId: string): string {
    const code = crypto.randomBytes(16).toString('hex');
    this.requests.set(code, { userId, expiresAt: Date.now() + REBIND_TTL_MS });
    return code;
  }

  // Bir martalik kod — topilsa userId qaytarib, xaritadan darhol o'chiradi
  consume(code: string): string | null {
    const request = this.requests.get(code);
    this.requests.delete(code);
    if (!request || Date.now() > request.expiresAt) return null;
    return request.userId;
  }
}
