import { registerEnumType } from '@nestjs/graphql';

export enum QuestionType {
  SINGLE   = 'SINGLE',   // 1 ta to'g'ri javob (hozirgi)
  MULTI    = 'MULTI',    // bir nechta to'g'ri javob (kelajak)
  MATCHING = 'MATCHING', // Milliy Sertifikat: bir nechta savol umumiy harfli javob bankidan tanlaydi
  TWO_PART = 'TWO_PART', // Milliy Sertifikat: ikkita mustaqil raqamli javob (a, b), har biri 1 ballik
}
registerEnumType(QuestionType, { name: 'QuestionType' });