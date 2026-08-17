import { registerEnumType } from '@nestjs/graphql';

export enum NotificationType {
  TEST_PUBLISHED = 'TEST_PUBLISHED',
}
registerEnumType(NotificationType, { name: 'NotificationType' });
