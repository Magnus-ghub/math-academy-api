export enum UserRole {
  STUDENT        = 'STUDENT',
  ACADEM_STUDENT = 'ACADEM_STUDENT',
  TEACHER        = 'TEACHER',
  ADMIN          = 'ADMIN',
}

export enum UserStatus {
  ACTIVE   = 'ACTIVE',
  BLOCKED  = 'BLOCKED',
  DELETED  = 'DELETED',
}

export enum UserAuthType {
  TELEGRAM = 'TELEGRAM',
  GOOGLE   = 'GOOGLE',
  PHONE = 'PHONE',
}