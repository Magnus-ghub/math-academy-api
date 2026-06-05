import { registerEnumType } from '@nestjs/graphql';

export enum QuestionType {
  SINGLE   = 'SINGLE',   // 1 ta to'g'ri javob (hozirgi)
  MULTI    = 'MULTI',    // bir nechta to'g'ri javob (kelajak)
}
registerEnumType(QuestionType, { name: 'QuestionType' });