import type { MessageEntity } from 'telegraf/types';
import {
  BroadcastAudience,
  BroadcastMediaType,
} from '../../libs/enums/broadcast.enum';

// Har bir oluvchiga yuboriladigan xabar tarkibi. entities — bot orqali
// yozilgan e'londagi formatlash (qalin, havola va h.k.), admin paneldan
// yuborilganda bo'lmaydi.
export interface BroadcastPayload {
  message: string;
  entities?: MessageEntity[] | null;
  mediaType?: BroadcastMediaType | null;
  mediaFileId?: string | null;
}

export interface BroadcastRequest extends BroadcastPayload {
  audience: BroadcastAudience;
  groupId?: string | null;
}
