import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Payment } from '../../libs/dto/payment/payment';
import { PaymentInput } from '../../libs/dto/payment/paymentInput';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../libs/enums/user.enum';

@Resolver(() => Payment)
export class PaymentsResolver {
  constructor(private paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Payment)
  async createPayment(
    @CurrentUser() user: any,
    @Args('input') input: PaymentInput,
  ) {
    return this.paymentsService.createPayment(user.userId, input);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => [Payment])
  async getMyPayments(@CurrentUser() user: any) {
    return this.paymentsService.getMyPayments(user.userId);
  }

  // ADMIN
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Query(() => [Payment])
  async getAllPayments() {
    return this.paymentsService.getAllPayments();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Query(() => [Payment])
  async getPendingPayments() {
    return this.paymentsService.getPendingPayments();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => Payment)
  async confirmManualPayment(
    @CurrentUser() user: any,
    @Args('paymentId') paymentId: string,
  ) {
    return this.paymentsService.confirmManualPayment(paymentId, user.userId);
  }
}