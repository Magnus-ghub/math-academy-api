import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ResultsService } from './results.service';
import { Result } from '../../libs/dto/result/result';
import { LeaderboardEntry } from '../../libs/dto/result/leaderboard';
import { ResultInput } from '../../libs/dto/result/resultInput';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
}