export enum TestType {
  DTM = 'DTM',
  SAT = 'SAT',
  MILLIY_SERTIFIKAT = 'MILLIY_SERTIFIKAT',
  ATTESTATSIYA = 'ATTESTATSIYA',
  DTM_GROUP = 'DTM_GROUP',
  SAT_GROUP = 'SAT_GROUP',
  MILLIY_GROUP = 'MILLIY_GROUP',
  ATTESTATSIYA_GROUP = 'ATTESTATSIYA_GROUP',
}

export enum TestAccess {
  PUBLIC = 'PUBLIC',
  PREMIUM = 'PREMIUM',
  GROUP = 'GROUP',
}

export enum TestDifficulty {
  EASY = 'EASY',
  STANDART = 'STANDART',
  HARD = 'HARD',
}

export enum TestStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum TestBlock {
  MANDATORY = 'MANDATORY', // majburiy blok (matematika)
  ELECTIVE  = 'ELECTIVE',  // tanlangan fan bloki
}