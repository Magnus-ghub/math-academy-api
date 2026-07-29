import { Resolver, Query, Mutation, Args, Subscription, Int } from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { ReportService, REPORT_CREATED } from './report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../libs/enums/user.enum';
import { Report } from 'src/libs/dto/report/report';
import { ReportInput } from 'src/libs/dto/report/reportInput';

@Resolver(() => Report)
export class ReportResolver {
  constructor(
    private reportService: ReportService,
    @Inject('PUB_SUB') private pubSub: PubSub,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Report)
  async createReport(
    @CurrentUser() user: any,
    @Args('input') input: ReportInput,
  ) {
    return this.reportService.createReport(user.userId, input);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Query(() => [Report])
  async getPendingReports() {
    return this.reportService.getPendingReports();
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => [Report])
  async getMyReports(@CurrentUser() user: any) {
    return this.reportService.getMyReports(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => Int)
  async getUnseenReportsCount(@CurrentUser() user: any) {
    return this.reportService.getUnseenReportsCount(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean)
  async markReportsSeen(@CurrentUser() user: any) {
    return this.reportService.markReportsSeen(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => Report)
  async resolveReport(
    @Args('reportId') reportId: string,
    @Args('adminReply', { nullable: true }) adminReply?: string,
  ) {
    return this.reportService.resolveReport(reportId, adminReply);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => Report)
  async rejectReport(
    @Args('reportId') reportId: string,
    @Args('adminReply', { nullable: true }) adminReply?: string,
  ) {
    return this.reportService.rejectReport(reportId, adminReply);
  }

  @Subscription(() => Report, { name: 'reportCreated' })
  reportCreated() {
    return this.pubSub.asyncIterableIterator(REPORT_CREATED);
  }
}
