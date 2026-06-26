import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TestsService } from './tests.service';
import { Test } from '../../libs/dto/test/test';
import { TestInput } from '../../libs/dto/test/testInput';
import { TestUpdate } from '../../libs/dto/test/testUpdate';
import { Question } from '../../libs/dto/question/question';
import { QuestionInput } from '../../libs/dto/question/questionInput';
import { QuestionUpdate } from '../../libs/dto/question/questionUpdate';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../libs/enums/user.enum';

@Resolver(() => Test)
export class TestsResolver {
  constructor(private testsService: TestsService) {}

  // Public
  @Query(() => [Test])
  async getPublicTests() {
    return this.testsService.getPublicTests();
  }

  // Barcha published testlar — login qilgan foydalanuvchilar uchun
  @UseGuards(JwtAuthGuard)
  @Query(() => [Test])
  async getTests() {
    return this.testsService.getPublicTests();
  }

  // Guruh testlari
  @UseGuards(JwtAuthGuard)
  @Query(() => [Test])
  async getGroupTests(@Args('groupId') groupId: string) {
    return this.testsService.getGroupTests(groupId);
  }

  // Test detail — access tekshiruvi bilan
  @UseGuards(JwtAuthGuard)
  @Query(() => Test)
  async getTest(
    @Args('testId') testId: string,
    @CurrentUser() user: any,
  ) {
    return this.testsService.getTestWithAccess(testId, user.userId);
  }

  // TEACHER + ADMIN
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @Mutation(() => Test)
  async createTest(
    @Args('input') input: TestInput,
    @CurrentUser() user: any,
  ) {
    return this.testsService.createTest(input, user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @Mutation(() => Test)
  async updateTest(
    @Args('testId') testId: string,
    @Args('input') input: TestUpdate,
  ) {
    return this.testsService.updateTest(testId, input);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @Mutation(() => Question)
  async addQuestion(@Args('input') input: QuestionInput) {
    return this.testsService.addQuestion(input);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => [Question])
  async getQuestions(@Args('testId') testId: string) {
    return this.testsService.getQuestionsByTest(testId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @Mutation(() => Question)
  async updateQuestion(
    @Args('questionId') questionId: string,
    @Args('input') input: QuestionUpdate,
  ) {
    return this.testsService.updateQuestion(questionId, input);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @Mutation(() => Boolean)
  async deleteQuestion(@Args('questionId') questionId: string) {
    return this.testsService.deleteQuestion(questionId);
  }

  // ADMIN
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Query(() => [Test])
  async getAllTests() {
    return this.testsService.getAllTests();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => Boolean)
  async deleteTest(@Args('testId') testId: string) {
    return this.testsService.deleteTest(testId);
  }
}