export enum PaymentProvider {
  CLICK  = 'CLICK',
  MANUAL = 'MANUAL',
}

export enum PaymentStatus {
  PENDING   = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED    = 'FAILED',
}

export enum PaymentType {
  PREMIUM = 'PREMIUM',  // ACADEM_STUDENT uchun
  GROUP   = 'GROUP',    // guruh uchun
}