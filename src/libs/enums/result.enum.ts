import { registerEnumType } from '@nestjs/graphql';

export enum ResultStatus {
  IN_PROGRESS = 'IN_PROGRESS',  // test hali tugamagan
  COMPLETED   = 'COMPLETED',    // tugatgan
  ABANDONED   = 'ABANDONED',    // yarim qoldirib ketgan
  TIME_UP     = 'TIME_UP',      // vaqt tugagan
}
registerEnumType(ResultStatus, { name: 'ResultStatus' });

export enum LeaderboardType {
  TEST   = 'TEST',    // bitta test bo'yicha
  DTM    = 'DTM',     // DTM testlari bo'yicha umumiy
  SAAT   = 'SAAT',
  MILLIY = 'MILLIY',
  ATTEST = 'ATTEST',
  GLOBAL = 'GLOBAL',  // hamma testlar bo'yicha
}
registerEnumType(LeaderboardType, { name: 'LeaderboardType' });