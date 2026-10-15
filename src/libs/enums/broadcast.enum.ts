import { registerEnumType } from '@nestjs/graphql';

export enum BroadcastAudience {
  ALL = 'ALL',
  STUDENTS = 'STUDENTS',
  TEACHERS = 'TEACHERS',
  GROUP = 'GROUP',
  // Sinov uchun — xabar faqat yuborayotgan adminning o'ziga boradi
  ME = 'ME',
}
registerEnumType(BroadcastAudience, { name: 'BroadcastAudience' });

export enum BroadcastStatus {
  SENDING = 'SENDING',
  DONE = 'DONE',
  // Yuborish tugamasdan server qayta ishga tushgan
  INTERRUPTED = 'INTERRUPTED',
}
registerEnumType(BroadcastStatus, { name: 'BroadcastStatus' });

export enum BroadcastMediaType {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
}
registerEnumType(BroadcastMediaType, { name: 'BroadcastMediaType' });
