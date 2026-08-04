import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ResultsService } from './results.service';
import { Result } from '../../libs/dto/result/result';
import { LeaderboardEntry } from '../../libs/dto/result/leaderboard';
import { AdminResultRow } from '../../libs/dto/result/adminResultRow';
import { TopStudentEntry } from '../../libs/dto/result/topStudent';
import { MilliySertifikatScoreResult } from '../../libs/dto/result/milliySertifikatScore';
import {
  ImportHistoricalResultsInput,
  ImportHistoricalResultsPayload,
} from '../../libs/dto/result/importHistoricalResults';
import { ResultInput } from '../../libs/dto/result/resultInput';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../libs/enums/user.enum';
import { LeaderboardPeriod } from '../../libs/enums/result.enum';

@Resolver(() => Result)
export class ResultsResolver {
  constructor(private resultsService: ResultsService) {}

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Result)
  async submitTest(
    @CurrentUser() user: any,
    @Args('input') input: ResultInput,
  ) {
    return this.resultsService.submitTest(user.userId, input, user.userRole);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => Result, { nullable: true })
  async checkMyAttempt(
    @CurrentUser() user: any,
    @Args('testId') testId: string,
  ) {
    return this.resultsService.checkMyAttempt(user.userId, testId);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => [Result])
  async getMyResults(@CurrentUser() user: any) {
    return this.resultsService.getMyResults(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => Result)
  async getResult(@Args('resultId') resultId: string) {
    return this.resultsService.getResultById(resultId);
  }

  @Query(() => [LeaderboardEntry])
  async getLeaderboard(@Args('testId') testId: string) {
    return this.resultsService.getLeaderboard(testId);
  }

  @Query(() => [TopStudentEntry])
  async getTopStudents(
    @Args('period', { type: () => LeaderboardPeriod, defaultValue: LeaderboardPeriod.WEEK })
    period: LeaderboardPeriod,
  ) {
    return this.resultsService.getTopStudents(period);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Query(() => [AdminResultRow])
  async getAllResultsForTest(@Args('testId') testId: string) {
    return this.resultsService.getAllResultsForTest(testId);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => MilliySertifikatScoreResult)
  async getMilliySertifikatScore(
    @CurrentUser() user: any,
    @Args('resultId') resultId: string,
  ) {
    return this.resultsService.getMilliySertifikatScore(resultId, user.userId, user.userRole);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => ImportHistoricalResultsPayload)
  async importHistoricalResults(@Args('input') input: ImportHistoricalResultsInput) {
    return this.resultsService.importHistoricalResults(
      input.testId,
      input.totalPoints,
      input.rawScores,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Query(() => Int)
  async getImportedResultsCount(@Args('testId') testId: string) {
    return this.resultsService.getImportedResultsCount(testId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => Int)
  async clearImportedResults(@Args('testId') testId: string) {
    return this.resultsService.clearImportedResults(testId);
  }
}