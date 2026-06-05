import { registerEnumType } from '@nestjs/graphql';

export enum CommentType {
  TEST = 'TEST',
  GENERAL = 'GENERAL',
}
registerEnumType(CommentType, { name: 'CommentType' });

export enum CommentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
registerEnumType(CommentStatus, { name: 'CommentStatus' });
