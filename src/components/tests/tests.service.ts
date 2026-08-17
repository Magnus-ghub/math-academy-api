import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { TestEntity, TestDocument } from '../../schema/Test.model';
import { QuestionEntity, QuestionDocument } from '../../schema/Question.model';
import {
  UserGroupEntity,
  UserGroupDocument,
} from '../../schema/User_Group.model';
import { ResultEntity, ResultDocument } from '../../schema/Result.model';
import { PaymentEntity, PaymentDocument } from '../../schema/Payment.model';
import { TestInput } from '../../libs/dto/test/testInput';
import { TestUpdate } from '../../libs/dto/test/testUpdate';
import { QuestionInput } from '../../libs/dto/question/questionInput';
import { TestAccess, TestStatus } from '../../libs/enums/test.enum';
import { UserRole } from '../../libs/enums/user.enum';
import { ResultStatus } from '../../libs/enums/result.enum';
import { PaymentType, PaymentStatus } from '../../libs/enums/payment.enum';

@Injectable()
export class TestsService {
  constructor(
    @InjectModel(TestEntity.name)
    private testModel: Model<TestDocument>,

    @InjectModel(QuestionEntity.name)
    private questionModel: Model<QuestionDocument>,

    @InjectModel(UserGroupEntity.name)
    private userGroupModel: Model<UserGroupDocument>,

    @InjectModel(ResultEntity.name)
    private resultModel: Model<ResultDocument>,

    @InjectModel(PaymentEntity.name)
    private paymentModel: Model<PaymentDocument>,
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

  // Access tekshiruvi — TEACHER/ADMIN uchun to'liq bypass, shu orqali admin
  // panelidagi "Ko'rish (Preview)" tugmasi hali PUBLISH qilinmagan (DRAFT)
  // yoki guruh/premium cheklovidagi testni ham talaba ko'radigan xuddi shu
  // sahifada, hech kimga ko'rinmasdan turib ko'ra oladi.
  async getTestWithAccess(
    testId: string,
    userId: string,
    userRole?: string,
  ): Promise<TestDocument> {
    const test = await this.getTestById(testId);

    if (userRole === UserRole.ADMIN || userRole === UserRole.TEACHER)
      return test;

    if (test.testStatus !== TestStatus.PUBLISHED) {
      throw new ForbiddenException('Bu test hali nashr etilmagan');
    }

    if (test.testAccess === TestAccess.PUBLIC) return test;

    if (test.testAccess === TestAccess.GROUP) {
      const hasAccess = await this.userGroupModel.findOne({
        userId,
        groupId: test.groupId,
        expiresAt: { $gt: new Date() },
      });
      if (!hasAccess)
        throw new ForbiddenException('Bu test faqat guruh talabalariga ochiq');
      return test;
    }

    if (test.testAccess === TestAccess.PREMIUM) {
      const hasAccess = await this.paymentModel.exists({
        userId,
        testId: String(test._id),
        paymentType: PaymentType.PREMIUM,
        paymentStatus: PaymentStatus.CONFIRMED,
      });
      if (!hasAccess)
        throw new ForbiddenException("Bu test uchun to'lov qilinmagan");
      return test;
    }

    throw new ForbiddenException('Kirish taqiqlangan');
  }

  // Barcha published testlar (PUBLIC + PREMIUM) — kirish huquqi test boshlananda tekshiriladi
  async getPublicTests(): Promise<TestDocument[]> {
    return this.testModel
      .find({ testStatus: TestStatus.PUBLISHED })
      .sort({ createdAt: -1 });
  }

  // Guruh testlari
  async getGroupTests(groupId: string): Promise<TestDocument[]> {
    return this.testModel
      .find({ groupId, testStatus: TestStatus.PUBLISHED })
      .sort({ createdAt: -1 });
  }

  // Savollar
  async addQuestion(input: QuestionInput): Promise<QuestionDocument> {
    const question = await this.questionModel.create(input);
    await this.testModel.updateOne(
      { _id: input.testId },
      { $inc: { totalQuestions: 1 } },
    );
    return question;
  }

  // Javob kaliti (correctAnswer, explanation) faqat ADMIN/TEACHER'ga yoki
  // testni allaqachon COMPLETED holatda topshirgan talabaga (natijani ko'rish
  // sahifasi) qaytariladi — hali imtihon topshirilmagan bo'lsa, bu maydonlar
  // client'ga (Network tab/Apollo cache orqali) sizib chiqmasligi uchun
  // olib tashlanadi.
  async getQuestionsByTest(
    testId: string,
    userId: string,
    userRole?: string,
  ): Promise<any[]> {
    await this.getTestWithAccess(testId, userId, userRole);
    const questions = await this.questionModel
      .find({ testId })
      .sort({ orderIndex: 1 });

    if (userRole === UserRole.ADMIN || userRole === UserRole.TEACHER)
      return questions;

    const hasCompleted = await this.resultModel.exists({
      userId,
      testId,
      resultStatus: ResultStatus.COMPLETED,
    });
    if (hasCompleted) return questions;

    return questions.map((q) => {
      const obj: any = q.toObject();
      obj.correctAnswer = null;
      obj.correctAnswerB = null;
      obj.explanation = null;
      return obj;
    });
  }

  async updateQuestion(
    questionId: string,
    input: any,
  ): Promise<QuestionDocument> {
    const q = await this.questionModel.findByIdAndUpdate(
      questionId,
      { $set: { ...input } },
      { new: true },
    );
    if (!q) throw new NotFoundException('Question not found');
    return q;
  }

  async deleteQuestion(questionId: string): Promise<boolean> {
    const question = await this.questionModel.findById(questionId);
    if (!question) throw new NotFoundException('Question not found');
    await this.questionModel.deleteOne({ _id: questionId });
    await this.testModel.updateOne(
      { _id: question.testId },
      { $inc: { totalQuestions: -1 } },
    );
    return true;
  }

  // Soft delete — test va savollar bazada saqlanib qoladi (talabalarning
  // eski natijalari buzilmasligi uchun), DELETED holatga o'tkaziladi va
  // getAllTests'dan (shu jumladan includeArchived:true bo'lsa ham) hamda
  // talaba ko'radigan ro'yxatlardan butunlay chiqarib tashlanadi — ARCHIVED
  // bilan aralashib, admin panelida chalg'ituvchi bo'lib qolmasligi uchun.
  async deleteTest(testId: string): Promise<boolean> {
    const test = await this.testModel.findById(testId);
    if (!test) throw new NotFoundException('Test not found');
    await this.testModel.updateOne(
      { _id: testId },
      { $set: { testStatus: TestStatus.DELETED } },
    );
    return true;
  }

  // Admin — o'chirilgan (DELETED) testlar hech qachon qaytarilmaydi, faqat
  // includeArchived orqali ARCHIVED testlarni ko'rsatish/yashirish tanlanadi.
  async getAllTests(includeArchived?: boolean): Promise<TestDocument[]> {
    const filter = includeArchived
      ? { testStatus: { $ne: TestStatus.DELETED } }
      : { testStatus: { $nin: [TestStatus.ARCHIVED, TestStatus.DELETED] } };
    return this.testModel.find(filter).sort({ createdAt: -1 });
  }

  // Savatcha — faqat DELETED testlar, asosiy ro'yxatlardan alohida.
  async getDeletedTests(): Promise<TestDocument[]> {
    return this.testModel
      .find({ testStatus: TestStatus.DELETED })
      .sort({ createdAt: -1 });
  }

  // Savatchadan tiklash — DRAFT holatiga qaytaradi, admin qayta ko'rib chiqib
  // (kerak bo'lsa) qaytadan nashr qiladi.
  async restoreTest(testId: string): Promise<TestDocument> {
    const test = await this.testModel.findById(testId);
    if (!test) throw new NotFoundException('Test not found');
    await this.testModel.updateOne(
      { _id: testId },
      { $set: { testStatus: TestStatus.DRAFT } },
    );
    return this.getTestById(testId);
  }

  // Muddati (closesAt) o'tgan testlarni har kecha avtomatik yopish (ARCHIVED) —
  // shundan keyin yangi urinish qabul qilinmaydi, kohorta o'sishi to'xtaydi.
  // DELETED testlar bu bilan qayta ARCHIVED holatiga qaytarib qo'yilmasligi kerak.
  @Cron('0 0 * * *')
  async closeExpiredTests() {
    const result = await this.testModel.updateMany(
      {
        closesAt: { $lt: new Date() },
        testStatus: { $nin: [TestStatus.ARCHIVED, TestStatus.DELETED] },
      },
      { $set: { testStatus: TestStatus.ARCHIVED } },
    );

    if (result.modifiedCount > 0) {
      console.log(`Auto-archived ${result.modifiedCount} tests past closesAt`);
    }
  }
}
