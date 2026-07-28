import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TestEntity, TestDocument } from '../../schema/Test.model';
import { QuestionEntity, QuestionDocument } from '../../schema/Question.model';
import { UserGroupEntity, UserGroupDocument } from '../../schema/User_Group.model';
import { TestInput } from '../../libs/dto/test/testInput';
import { TestUpdate } from '../../libs/dto/test/testUpdate';
import { QuestionInput } from '../../libs/dto/question/questionInput';
import { TestAccess, TestStatus } from '../../libs/enums/test.enum';

@Injectable()
export class TestsService {
  constructor(
    @InjectModel(TestEntity.name)
    private testModel: Model<TestDocument>,

    @InjectModel(QuestionEntity.name)
    private questionModel: Model<QuestionDocument>,

    @InjectModel(UserGroupEntity.name)
    private userGroupModel: Model<UserGroupDocument>,
  ) {}

  async createTest(input: TestInput, createdBy: string): Promise<TestDocument> {
    return this.testModel.create({ ...input, createdBy });
  }

  async updateTest(testId: string, input: TestUpdate): Promise<TestDocument> {
    await this.testModel.updateOne({ _id: testId }, { $set: { ...input } });
    return this.getTestById(testId);
  }

  async getTestById(testId: string): Promise<TestDocument> {
    const test = await this.testModel.findById(testId);
    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  // Access tekshiruvi
  async getTestWithAccess(testId: string, userId: string): Promise<TestDocument> {
    const test = await this.getTestById(testId);

    if (test.testAccess === TestAccess.PUBLIC) return test;

    if (test.testAccess === TestAccess.GROUP) {
      const hasAccess = await this.userGroupModel.findOne({
        userId,
        groupId: test.groupId,
        expiresAt: { $gt: new Date() },
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

  // Barcha published testlar (PUBLIC + PREMIUM) — kirish huquqi test boshlananda tekshiriladi
  async getPublicTests(): Promise<TestDocument[]> {
    return this.testModel.find({ testStatus: TestStatus.PUBLISHED }).sort({ createdAt: -1 });
  }

  // Guruh testlari
  async getGroupTests(groupId: string): Promise<TestDocument[]> {
    return this.testModel.find({ groupId, testStatus: TestStatus.PUBLISHED }).sort({ createdAt: -1 });
  }

  // Savollar
  async addQuestion(input: QuestionInput): Promise<QuestionDocument> {
    const question = await this.questionModel.create(input);
    await this.testModel.updateOne({ _id: input.testId }, { $inc: { totalQuestions: 1 } });
    return question;
  }

  async getQuestionsByTest(testId: string): Promise<QuestionDocument[]> {
    return this.questionModel.find({ testId }).sort({ orderIndex: 1 });
  }

  async updateQuestion(questionId: string, input: any): Promise<QuestionDocument> {
    const q = await this.questionModel.findByIdAndUpdate(questionId, { $set: { ...input } }, { new: true });
    if (!q) throw new NotFoundException('Question not found');
    return q;
  }

  async deleteQuestion(questionId: string): Promise<boolean> {
    const question = await this.questionModel.findById(questionId);
    if (!question) throw new NotFoundException('Question not found');
    await this.questionModel.deleteOne({ _id: questionId });
    await this.testModel.updateOne({ _id: question.testId }, { $inc: { totalQuestions: -1 } });
    return true;
  }

  // Soft delete — test va savollar bazada saqlanib qoladi (talabalarning
  // eski natijalari buzilmasligi uchun), faqat ARCHIVED holatga o'tkaziladi
  // va admin ro'yxatida (getAllTests) hamda talaba ko'radigan ro'yxatlarda
  // (getPublicTests, getGroupTests — testStatus: PUBLISHED filtri orqali)
  // ko'rinmay qoladi.
  async deleteTest(testId: string): Promise<boolean> {
    const test = await this.testModel.findById(testId);
    if (!test) throw new NotFoundException('Test not found');
    await this.testModel.updateOne({ _id: testId }, { $set: { testStatus: TestStatus.ARCHIVED } });
    return true;
  }

  // Admin
  async getAllTests(): Promise<TestDocument[]> {
    return this.testModel.find({ testStatus: { $ne: TestStatus.ARCHIVED } }).sort({ createdAt: -1 });
  }
}
