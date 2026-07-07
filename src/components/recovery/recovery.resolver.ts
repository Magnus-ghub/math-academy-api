import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RecoveryService } from './recovery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../libs/enums/user.enum';
import { RecoveryRequest } from 'src/libs/dto/recovery/recoveryRequest';
import { RecoveryRequestInput } from 'src/libs/dto/recovery/recoveryRequestInput';

@Resolver(() => RecoveryRequest)
export class RecoveryResolver {
  constructor(private recoveryService: RecoveryService) {}

  @Mutation(() => Boolean)
  async submitRecoveryRequest(@Args('input') input: RecoveryRequestInput) {
    return this.recoveryService.submitRequest(input);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Query(() => [RecoveryRequest])
  async getRecoveryRequests() {
    return this.recoveryService.getRequests();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => RecoveryRequest)
  async resolveRecoveryRequest(@Args('id') id: string) {
    return this.recoveryService.resolveRequest(id);
  }
}
