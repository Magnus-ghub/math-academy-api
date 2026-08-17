import { registerEnumType } from '@nestjs/graphql';

export enum PaymentProvider {
  CLICK = 'CLICK',
  MANUAL = 'MANUAL',
  BALANCE = 'BALANCE', // ichki balansdan yechilgan xarid
}
registerEnumType(PaymentProvider, { name: 'PaymentProvider' });

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED', // talaba o'zi PENDING so'rovni bekor qilgan
}
registerEnumType(PaymentStatus, { name: 'PaymentStatus' });

export enum PaymentType {
  PREMIUM = 'PREMIUM', // aniq bir test uchun (endi faqat balansdan sotib olinadi)
  GROUP = 'GROUP', // guruh uchun
  TOPUP = 'TOPUP', // balansni to'ldirish
  ADJUSTMENT = 'ADJUSTMENT', // admin tomonidan qo'lda balans tuzatish
}
registerEnumType(PaymentType, { name: 'PaymentType' });
