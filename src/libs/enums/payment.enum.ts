import { registerEnumType } from '@nestjs/graphql';

export enum PaymentProvider {
  CLICK  = 'CLICK',
  MANUAL = 'MANUAL',
}
registerEnumType(PaymentProvider, { name: 'PaymentProvider' });

export enum PaymentStatus {
  PENDING   = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED    = 'FAILED',
}
registerEnumType(PaymentStatus, { name: 'PaymentStatus' });

export enum PaymentType {
  PREMIUM = 'PREMIUM',  // ACADEM_STUDENT uchun
  GROUP   = 'GROUP',    // guruh uchun
}
registerEnumType(PaymentType, { name: 'PaymentType' });