import { registerEnumType } from '@nestjs/graphql';

export enum ResultStatus {
  IN_PROGRESS = 'IN_PROGRESS',  // test hali tugamagan
  COMPLETED   = 'COMPLETED',    // tugatgan
  ABANDONED   = 'ABANDONED',    // yarim qoldirib ketgan
  TIME_UP     = 'TIME_UP',      // vaqt tugagan
}
registerEnumType(ResultStatus, { name: 'ResultStatus' });

// Result talaba tomonidan platformada topshirilganmi (PLATFORM), yoki
// eski Excel-asosli tizimdan Rasch kogortasini boyitish uchun import
// qilingan tarixiy qatormi (IMPORTED) — IMPORTED qatorlar haqiqiy
// foydalanuvchiga bog'lanmaydi, faqat kogorta hisobida ishtirok etadi.
export enum ResultSource {
  PLATFORM = 'PLATFORM',
  IMPORTED = 'IMPORTED',
}
registerEnumType(ResultSource, { name: 'ResultSource' });

export enum LeaderboardType {
  TEST   = 'TEST',    // bitta test bo'yicha
  DTM    = 'DTM',     // DTM testlari bo'yicha umumiy
  SAAT   = 'SAAT',
  MILLIY = 'MILLIY',
  ATTEST = 'ATTEST',
  GLOBAL = 'GLOBAL',  // hamma testlar bo'yicha
}
registerEnumType(LeaderboardType, { name: 'LeaderboardType' });

export enum LeaderboardPeriod {
  WEEK  = 'WEEK',   // so'nggi 7 kun
  MONTH = 'MONTH',  // so'nggi 30 kun
}
registerEnumType(LeaderboardPeriod, { name: 'LeaderboardPeriod' });