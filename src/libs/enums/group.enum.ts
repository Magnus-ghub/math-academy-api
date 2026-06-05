import { registerEnumType } from '@nestjs/graphql';

export enum GroupType {
  DTM = 'DTM',
  SAT = 'SAT',
  MILLIY_SERTIFIKAT = 'MILLIY_SERTIFIKAT',
  ATTESTATSIYA = 'ATTESTATSIYA',
}
registerEnumType(GroupType, { name: 'GroupType' });

export enum GroupStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}
registerEnumType(GroupStatus, { name: 'GroupStatus' });

