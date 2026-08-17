import {
  Resolver,
  Query,
  Mutation,
  Args,
  Subscription,
  Int,
} from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PaymentsService, PAYMENT_REPORTED } from './payments.service';
import { Payment } from '../../libs/dto/payment/payment';
import { ClickPaymentInitResult } from '../../libs/dto/payment/paymentInitResult';
import { PaymentStats, TopTest } from '../../libs/dto/payment/paymentStats';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../libs/enums/user.enum';

@Resolver(() => Payment)
export class PaymentsResolver {
  constructor(
    private paymentsService: PaymentsService,
    @Inject('PUB_SUB') private pubSub: PubSub,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Query(() => [Payment])
  async getMyPayments(@CurrentUser() user: any) {
    return this.paymentsService.getMyPayments(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => [String])
  async getMyPurchasedTestIds(@CurrentUser() user: any) {
    return this.paymentsService.getMyPurchasedTestIds(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => Int)
  async getMyBalance(@CurrentUser() user: any) {
    return this.paymentsService.getMyBalance(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => ClickPaymentInitResult)
  async initiateClickTopup(
    @CurrentUser() user: any,
    @Args('amount', { type: () => Int }) amount: number,
  ) {
    return this.paymentsService.initiateClickTopup(user.userId, amount);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Payment)
  async reportManualTopup(
    @CurrentUser() user: any,
    @Args('amount', { type: () => Int }) amount: number,
    @Args('receiptUrl', { nullable: true }) receiptUrl?: string,
    @Args('studentNote', { nullable: true }) studentNote?: string,
  ) {
    return this.paymentsService.reportManualTopup(
      user.userId,
      amount,
      receiptUrl,
      studentNote,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Payment)
  async purchaseTestWithBalance(
    @CurrentUser() user: any,
    @Args('testId') testId: string,
  ) {
    return this.paymentsService.purchaseTestWithBalance(user.userId, testId);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Payment)
  async cancelMyPendingPayment(
    @CurrentUser() user: any,
    @Args('paymentId') paymentId: string,
  ) {
    return this.paymentsService.cancelMyPendingPayment(user.userId, paymentId);
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
  @Query(() => PaymentStats)
  async getPaymentStats() {
    return this.paymentsService.getPaymentStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Query(() => [TopTest])
  async getTestSalesStats() {
    return this.paymentsService.getTestSalesStats();
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
    @Args('confirmedAmount', { type: () => Int }) confirmedAmount: number,
    @Args('adminReply', { nullable: true }) adminReply?: string,
  ) {
    return this.paymentsService.confirmManualPayment(
      paymentId,
      user.userId,
      confirmedAmount,
      adminReply,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => Payment)
  async rejectManualPayment(
    @Args('paymentId') paymentId: string,
    @Args('adminReply', { nullable: true }) adminReply?: string,
  ) {
    return this.paymentsService.rejectManualPayment(paymentId, adminReply);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => Payment)
  async adjustUserBalance(
    @CurrentUser() user: any,
    @Args('userId') userId: string,
    @Args('amount', { type: () => Int }) amount: number,
    @Args('reason', { nullable: true }) reason?: string,
  ) {
    return this.paymentsService.adjustUserBalance(
      user.userId,
      userId,
      amount,
      reason,
    );
  }

  @Subscription(() => Payment, { name: 'paymentReported' })
  paymentReported() {
    return this.pubSub.asyncIterableIterator(PAYMENT_REPORTED);
  }
}
