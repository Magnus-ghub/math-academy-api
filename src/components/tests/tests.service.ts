import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { TestEntity } from '../../schema/Test.model';
import { QuestionEntity } from '../../schema/Question.model';
import { UserGroupEntity } from '../../schema/User_Group.model';
import { TestInput } from '../../libs/dto/test/testInput';
import { TestUpdate } from '../../libs/dto/test/testUpdate';
import { QuestionInput } from '../../libs/dto/question/questionInput';
import { TestAccess, TestStatus } from '../../libs/enums/test.enum';

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(TestEntity)
    private testRepo: Repository<TestEntity>,

    @InjectRepository(QuestionEntity)
    private questionRepo: Repository<QuestionEntity>,

    @InjectRepository(UserGroupEntity)
    private userGroupRepo: Repository<UserGroupEntity>,
  ) {}

  async createTest(input: TestInput, createdBy: string): Promise<TestEntity> {
    const test = this.testRepo.create({ ...input, createdBy });
    return this.testRepo.save(test);
  }

  async updateTest(testId: string, input: TestUpdate): Promise<TestEntity> {
    await this.testRepo.update(testId, { ...input });
    return this.getTestById(testId);
  }

  async getTestById(testId: string): Promise<TestEntity> {
    const test = await this.testRepo.findOne({ where: { id: testId } });
    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  // Access tekshiruvi
  async getTestWithAccess(testId: string, userId: string): Promise<TestEntity> {
    const test = await this.getTestById(testId);

    if (test.testAccess === TestAccess.PUBLIC) return test;

    if (test.testAccess === TestAccess.GROUP) {
      const hasAccess = await this.userGroupRepo.findOne({
        where: {
          userId,
          groupId: test.groupId,
          expiresAt: MoreThan(new Date()),
        },
      });
      if (!hasAccess) throw new ForbiddenException('Bu test faqat guruh talabalariga ochiq');
      return test;
    }

    if (test.testAccess === TestAccess.PREMIUM) {
      // PREMIUM tekshiruvi UsersService da — guard orqali
      return test;
    }

    throw new ForbiddenException('Kirish taqiqlangan');
  }

  // Public testlar
  async getPublicTests(): Promise<TestEntity[]> {
    return this.testRepo.find({
      where: { testAccess: TestAccess.PUBLIC, testStatus: TestStatus.PUBLISHED },
      order: { createdAt: 'DESC' },
    });
  }

  // Guruh testlari
  async getGroupTests(groupId: string): Promise<TestEntity[]> {
    return this.testRepo.find({
      where: { groupId, testStatus: TestStatus.PUBLISHED },
      order: { createdAt: 'DESC' },
    });
  }

  // Savollar
  async addQuestion(input: QuestionInput): Promise<QuestionEntity> {
    const question = this.questionRepo.create(input);
    await this.testRepo.increment({ id: input.testId }, 'totalQuestions', 1);
    return this.questionRepo.save(question);
  }

  async getQuestionsByTest(testId: string): Promise<QuestionEntity[]> {
    return this.questionRepo.find({
      where: { testId },
      order: { orderIndex: 'ASC' },
    });
  }

  async deleteQuestion(questionId: string): Promise<boolean> {
    const question = await this.questionRepo.findOne({ where: { id: questionId } });
    if (!question) throw new NotFoundException('Question not found');
    await this.questionRepo.remove(question);
    await this.testRepo.decrement({ id: question.testId }, 'totalQuestions', 1);
    return true;
  }

  // Admin
  async getAllTests(): Promise<TestEntity[]> {
    return this.testRepo.find({ order: { createdAt: 'DESC' } });
  }
}