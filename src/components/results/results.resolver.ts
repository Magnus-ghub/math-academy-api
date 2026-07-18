import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ResultsService } from './results.service';
import { Result } from '../../libs/dto/result/result';
import { LeaderboardEntry } from '../../libs/dto/result/leaderboard';
import { AdminResultRow } from '../../libs/dto/result/adminResultRow';
import { ResultInput } from '../../libs/dto/result/resultInput';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../libs/enums/user.enum';

@Resolver(() => Result)
export class ResultsResolver {
  constructor(private resultsService: ResultsService) {}

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Result)
  async submitTest(
    @CurrentUser() user: any,
    @Args('input') input: ResultInput,
  ) {
    return this.resultsService.submitTest(user.userId, input);
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Query(() => [AdminResultRow])
  async getAllResultsForTest(@Args('testId') testId: string) {
    return this.resultsService.getAllResultsForTest(testId);
  }
}