import { registerEnumType } from '@nestjs/graphql';

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}
registerEnumType(SortDirection, { name: 'SortDirection' });

export enum FileType {
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
}
registerEnumType(FileType, { name: 'FileType' });

export enum Currency {
  UZS = 'UZS',
  USD = 'USD',
}
registerEnumType(Currency, { name: 'Currency' });
