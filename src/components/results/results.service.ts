import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResultEntity, ResultDocument } from '../../schema/Result.model';
import { TestEntity, TestDocument } from '../../schema/Test.model';
import { QuestionEntity, QuestionDocument } from '../../schema/Question.model';
import { UserEntity, UserDocument } from '../../schema/User.model';
import { ResultInput } from '../../libs/dto/result/resultInput';
import { ResultStatus } from '../../libs/enums/result.enum';
import { TestType } from '../../libs/enums/test.enum';
import { TeacherCategory } from '../../libs/enums/user.enum';
import { LeaderboardEntry } from '../../libs/dto/result/leaderboard';
import { AdminResultRow } from '../../libs/dto/result/adminResultRow';

@Injectable()
export class ResultsService {
  constructor(
    @InjectModel(ResultEntity.name)
    private resultModel: Model<ResultDocument>,

    @InjectModel(TestEntity.name)
    private testModel: Model<TestDocument>,

    @InjectModel(QuestionEntity.name)
    private questionModel: Model<QuestionDocument>,

    @InjectModel(UserEntity.name)
    private userModel: Model<UserDocument>,
  ) {}

  async submitTest(userId: string, input: ResultInput): Promise<ResultDocument> {
    const test = await this.testModel.findById(input.testId);
    if (!test) throw new NotFoundException('Test not found');

    const existing = await this.resultModel.findOne({
      userId,
      testId: input.testId,
      resultStatus: ResultStatus.COMPLETED,
    });
    if (existing) throw new ConflictException('Bu testni allaqachon topshirgansiz');

    const questions = await this.questionModel.find({ testId: input.testId });

    // Javoblarni tekshirish
    let correctAnswers = 0;
    const answers = input.answers.map((answer) => {
      const question = questions.find((q) => q.id === answer.questionId);
      const isCorrect = question?.correctAnswer === answer.selectedAnswer;
      if (isCorrect) correctAnswers++;
      return {
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        isCorrect,
        timeSpent: answer.timeSpent,
      };
    });

    const score = (correctAnswers / questions.length) * 100;

    await this.testModel.updateOne({ _id: input.testId }, { $inc: { totalAttempts: 1 } });

    const result = await this.resultModel.create({
      userId,
      testId: input.testId,
      groupId: test.groupId,
      totalQuestions: questions.length,
      correctAnswers,
      score,
      duration: input.duration,
      answers,
      resultStatus: ResultStatus.COMPLETED,
      finishedAt: new Date(),
    });

    if (test.testType === TestType.ATTESTATSIYA) {
      const category = this.getAttestationCategory(correctAnswers * 2);
      if (category) {
        await this.userModel.updateOne({ _id: userId }, { teacherCategory: category });
      }
    }

    return result;
  }

  async checkMyAttempt(userId: string, testId: string): Promise<ResultDocument | null> {
    return this.resultModel.findOne({ userId, testId, resultStatus: ResultStatus.COMPLETED });
  }

  // Admin talaba so'roviga ko'ra qayta topshirishga ruxsat berganda chaqiriladi —
  // eski urinishni o'chiradi, shunda checkMyAttempt bo'sh qaytadi.
  async resetAttempt(userId: string, testId: string): Promise<void> {
    await this.resultModel.deleteOne({ userId, testId, resultStatus: ResultStatus.COMPLETED });
  }

  async getMyResults(userId: string): Promise<any[]> {
    const results = await this.resultModel.find({ userId }).sort({ createdAt: -1 });

    const testIds = [...new Set(results.map((r) => r.testId))];
    const tests = await this.testModel.find({ _id: { $in: testIds } });
    const testMap = new Map<string, TestDocument>(tests.map((t) => [t.id, t]));

    return results.map((r) => ({
      ...r.toObject(),
      testTitle: testMap.get(r.testId)?.testTitle ?? null,
      testType: testMap.get(r.testId)?.testType ?? null,
    }));
  }

  async getResultById(resultId: string): Promise<any> {
    const result = await this.resultModel.findById(resultId);
    if (!result) throw new NotFoundException('Result not found');
    const test = await this.testModel.findById(result.testId);

    const base = {
      ...result.toObject(),
      testTitle: test?.testTitle ?? null,
      testType: test?.testType ?? null,
    };

    if (test?.testType !== TestType.ATTESTATSIYA) return base;

    const questions = await this.questionModel.find({ testId: result.testId }).sort({ orderIndex: 1 });

    const questionMap = new Map(questions.map((q) => [q.id, q]));
    const totalPoints = result.correctAnswers * 2;
    const grade = this.getAttestationGrade(totalPoints);

    const sectionOrder: string[] = [];
    const sectionMap = new Map<string, { orderIndex: number; questionId: string; isCorrect: boolean }[]>();

    for (const answer of result.answers ?? []) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;
      const sectionName = question.section || 'Asosiy';
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, []);
        sectionOrder.push(sectionName);
      }
      sectionMap.get(sectionName)!.push({
        orderIndex: question.orderIndex,
        questionId: answer.questionId,
        isCorrect: answer.isCorrect,
      });
    }

    const sections = sectionOrder.map((name) => ({
      name,
      questions: sectionMap.get(name)!.sort((a, b) => a.orderIndex - b.orderIndex),
    }));

    return { ...base, attestationData: { totalPoints, grade, sections } };
  }

  // Frontenddagi getAttestatsiyaToifa bilan bir xil bo'sag'alar — result sahifasida
  // ko'rsatilgan toifa va profilga saqlanadigan toifa mos kelishi uchun.
  private getAttestationCategory(points: number): TeacherCategory | null {
    if (points >= 80) return TeacherCategory.OLIY_TOIFA;
    if (points >= 70) return TeacherCategory.BIRINCHI_TOIFA;
    if (points >= 60) return TeacherCategory.IKKINCHI_TOIFA;
    if (points >= 56) return TeacherCategory.MUTAXASSIS;
    return null;
  }

  private getAttestationGrade(points: number): string | null {
    const category = this.getAttestationCategory(points);
    if (!category) return null;
    if (points >= 86) return 'Oliy toifa + 70% ustama';
    const labels: Record<TeacherCategory, string> = {
      [TeacherCategory.MUTAXASSIS]: 'Mutaxassis',
      [TeacherCategory.IKKINCHI_TOIFA]: 'Ikkinchi toifa',
      [TeacherCategory.BIRINCHI_TOIFA]: 'Birinchi toifa',
      [TeacherCategory.OLIY_TOIFA]: 'Oliy toifa',
    };
    return labels[category];
  }

  async getLeaderboard(testId: string): Promise<LeaderboardEntry[]> {
    const results = await this.resultModel
      .find({ testId, resultStatus: ResultStatus.COMPLETED })
      .sort({ score: -1, duration: 1 })
      .limit(10);

    if (results.length === 0) return [];

    const userIds = [...new Set(results.map((r) => r.userId))];
    const users = await this.userModel.find({ _id: { $in: userIds } });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return results.map((r, i) => {
      const user = userMap.get(r.userId);
      const parts = [user?.userName, user?.userLastName].filter(Boolean);
      const userName = parts.length > 0 ? parts.join(' ') : 'Foydalanuvchi';
      return {
        rank: i + 1,
        userId: r.userId,
        userName,
        userImage: user?.userImage ?? undefined,
        score: r.score,
        correctAnswers: r.correctAnswers,
        totalQuestions: r.totalQuestions,
        duration: r.duration,
      };
    });
  }

  async getAllResultsForTest(testId: string): Promise<AdminResultRow[]> {
    const results = await this.resultModel
      .find({ testId })
      .sort({ score: -1, duration: 1, createdAt: -1 });

    if (results.length === 0) return [];

    const userIds = [...new Set(results.map((r) => r.userId))];
    const [users, test] = await Promise.all([
      this.userModel.find({ _id: { $in: userIds } }),
      this.testModel.findById(testId),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));

    return results.map((r) => {
      const user = userMap.get(r.userId);
      return {
        id: r.id,
        userId: r.userId,
        testTitle: test?.testTitle ?? undefined,
        userName: user?.userName ?? undefined,
        userLastName: user?.userLastName ?? undefined,
        userPhone: user?.userPhone ?? undefined,
        userEmail: user?.userEmail ?? undefined,
        resultStatus: r.resultStatus,
        totalQuestions: r.totalQuestions,
        correctAnswers: r.correctAnswers,
        score: r.score,
        duration: r.duration,
        finishedAt: r.finishedAt ?? undefined,
        createdAt: r.createdAt,
      };
    });
  }

  async getGlobalLeaderboard(): Promise<any[]> {
    const rows = await this.resultModel.aggregate([
      { $match: { resultStatus: ResultStatus.COMPLETED } },
      { $group: { _id: '$userId', avgScore: { $avg: '$score' }, totalTests: { $sum: 1 } } },
      { $sort: { avgScore: -1 } },
      { $limit: 20 },
    ]);

    return rows.map((row) => ({
      userId: row._id,
      avgScore: row.avgScore,
      totalTests: row.totalTests,
    }));
  }
}
