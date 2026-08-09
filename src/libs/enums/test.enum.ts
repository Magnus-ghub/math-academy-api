import { registerEnumType } from '@nestjs/graphql';

export enum TestType {
  DTM = 'DTM',
  SAT = 'SAT',
  MILLIY_SERTIFIKAT = 'MILLIY_SERTIFIKAT',
  ATTESTATSIYA = 'ATTESTATSIYA',
}
registerEnumType(TestType, { name: 'TestType' });

export enum TestAccess {
  PUBLIC = 'PUBLIC',
  PREMIUM = 'PREMIUM',
  GROUP = 'GROUP',
}
registerEnumType(TestAccess, { name: 'TestAccess' });

export enum TestDifficulty {
  EASY = 'EASY',
  STANDART = 'STANDART',
  HARD = 'HARD',
}
registerEnumType(TestDifficulty, { name: 'TestDifficulty' });

export enum TestStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}
registerEnumType(TestStatus, { name: 'TestStatus' });

export enum TestBlock {
  MANDATORY = 'MANDATORY', // majburiy blok (matematika)
  ELECTIVE = 'ELECTIVE', // tanlangan fan bloki
}
registerEnumType(TestBlock, { name: 'TestBlock' });

export enum DTMType {
  MAJBURIY = 'MAJBURIY',
  ASOSIY = 'ASOSIY',
  FULL = 'FULL',
}
registerEnumType(DTMType, { name: 'DTMType' });
