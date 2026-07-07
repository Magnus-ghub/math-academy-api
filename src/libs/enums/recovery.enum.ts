import { registerEnumType } from '@nestjs/graphql';

export enum RecoveryStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
}
registerEnumType(RecoveryStatus, { name: 'RecoveryStatus' });
