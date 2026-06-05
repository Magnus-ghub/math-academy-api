import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../libs/enums/user.enum';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);