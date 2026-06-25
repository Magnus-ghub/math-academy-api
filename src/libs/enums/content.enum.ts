import { registerEnumType } from '@nestjs/graphql';

export enum ContentType {
  SUCCESS_STORY = 'SUCCESS_STORY',
  TEACHER       = 'TEACHER',
  EVENT         = 'EVENT',
  NEWS          = 'NEWS',
  FAQ           = 'FAQ',
  BANNER        = 'BANNER',
  BOOK          = 'BOOK',
  LESSON        = 'LESSON',
}
registerEnumType(ContentType, { name: 'ContentType' });

export enum ContentStatus {
  DRAFT     = 'DRAFT',     
  PUBLISHED = 'PUBLISHED',
  ARCHIVED  = 'ARCHIVED', 
}
registerEnumType(ContentStatus, { name: 'ContentStatus' });