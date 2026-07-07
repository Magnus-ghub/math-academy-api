import { registerEnumType } from '@nestjs/graphql';

export enum UserRole {
  STUDENT = 'STUDENT',
  ACADEM_STUDENT = 'ACADEM_STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}
registerEnumType(UserRole, { name: 'UserRole' });

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  DELETED = 'DELETED',
}
registerEnumType(UserStatus, { name: 'UserStatus' });

export enum UserAuthType {
  TELEGRAM = 'TELEGRAM',
  GOOGLE = 'GOOGLE',
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
}
registerEnumType(UserAuthType, { name: 'UserAuthType' });

export enum TeacherCategory {
  MUTAXASSIS = 'MUTAXASSIS',
  IKKINCHI_TOIFA = 'IKKINCHI_TOIFA',
  BIRINCHI_TOIFA = 'BIRINCHI_TOIFA',
  OLIY_TOIFA = 'OLIY_TOIFA',
}
registerEnumType(TeacherCategory, { name: 'TeacherCategory' });
