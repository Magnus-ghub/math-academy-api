import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResultEntity, ResultDocument } from '../../schema/Result.model';
import { TestEntity, TestDocument } from '../../schema/Test.model';
import { QuestionEntity, QuestionDocument } from '../../schema/Question.model';
import { UserEntity, UserDocument } from '../../schema/User.model';
import { ResultInput } from '../../libs/dto/result/resultInput';
import { ResultStatus } from '../../libs/enums/result.enum';
import { TestStatus, TestType } from '../../libs/enums/test.enum';
import { TeacherCategory, UserRole } from '../../libs/enums/user.enum';
import { LeaderboardEntry } from '../../libs/dto/result/leaderboard';
import { AdminResultRow } from '../../libs/dto/result/adminResultRow';
import { TopStudentEntry } from '../../libs/dto/result/topStudent';
import { LeaderboardPeriod } from '../../libs/enums/result.enum';
import { getSatMathScaledScore } from '../../libs/constants/sat-scoring.constant';
import {
  MILLIY_SERTIFIKAT_MIN_RESPONDENTS,
  computeLogit,
  computeCohortStats,
  getMilliySertifikatGrade,
} from '../../libs/constants/rasch-scoring.constant';
import { QuestionType } from '../../libs/enums/question.enum';

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

  async submitTest(userId: string, input: ResultInput, userRole?: string): Promise<ResultDocument> {
    const test = await this.testModel.findById(input.testId);
    if (!test) throw new NotFoundException('Test not found');

    // Preview qilayotgan ADMIN/TEACHER bundan mustasno — qolganlar hali
    // nashr etilmagan (DRAFT/ARCHIVED) testni to'g'ridan-to'g'ri mutation
    // orqali (sahifadan chetlab) topshira olmasin.
    if (
      test.testStatus !== TestStatus.PUBLISHED &&
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.TEACHER
    ) {
      throw new ForbiddenException('Bu test hali nashr etilmagan');
    }

    const existing = await this.resultModel.findOne({
      userId,
      testId: input.testId,
      resultStatus: ResultStatus.COMPLETED,
    });
    if (existing) throw new ConflictException('Bu testni allaqachon topshirgansiz');

    const questions = await this.questionModel.find({ testId: input.testId });

    // Javoblarni tekshirish. TWO_PART turidagi savollarda (Milliy Sertifikat)
    // ikkita mustaqil javob (a, b) bor, har biri 1 balldan — shu sabab
    // "to'g'ri javoblar soni" (har savol 1 ball) dan tashqari "xom ball"
    // (rawPoints, har item 1 ball) alohida hisoblanadi.
    let correctAnswers = 0;
    let rawPoints = 0;
    const answers = input.answers.map((answer) => {
      const question = questions.find((q) => q.id === answer.questionId);

      if (question?.questionType === QuestionType.TWO_PART) {
        const isCorrect = question.correctAnswer === answer.selectedAnswer;
        const isCorrectB =
          question.correctAnswerB != null && question.correctAnswerB === answer.selectedAnswerB;
        rawPoints += (isCorrect ? 1 : 0) + (isCorrectB ? 1 : 0);
        if (isCorrect && isCorrectB) correctAnswers++;
        return {
          questionId: answer.questionId,
          selectedAnswer: answer.selectedAnswer,
          selectedAnswerB: answer.selectedAnswerB ?? null,
          isCorrect,
          isCorrectB,
          timeSpent: answer.timeSpent,
        };
      }

      const isCorrect = question?.correctAnswer === answer.selectedAnswer;
      if (isCorrect) {
        correctAnswers++;
        rawPoints++;
      }
      return {
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        isCorrect,
        timeSpent: answer.timeSpent,
      };
    });

    const totalPoints = questions.reduce(
      (sum, q) => sum + (q.questionType === QuestionType.TWO_PART ? 2 : 1),
      0,
    );
    const score = (correctAnswers / questions.length) * 100;
    const satScore =
      test.testType === TestType.SAT ? getSatMathScaledScore(correctAnswers, questions.length) : null;

    await this.testModel.updateOne({ _id: input.testId }, { $inc: { totalAttempts: 1 } });

    const result = await this.resultModel.create({
      userId,
      testId: input.testId,
      groupId: test.groupId,
      totalQuestions: questions.length,
      correctAnswers,
      score,
      satScore,
      rawPoints: test.testType === TestType.MILLIY_SERTIFIKAT ? rawPoints : null,
      totalPoints: test.testType === TestType.MILLIY_SERTIFIKAT ? totalPoints : null,
      duration: input.duration,
      answers,
      resultStatus: ResultStatus.COMPLETED,
      finishedAt: new Date(),
    });

    if (test.testType === TestType.ATTESTATSIYA) {
      const attestPercentage = questions.length > 0 ? (correctAnswers / questions.length) * 100 : 0;
      const category = this.getAttestationCategory(attestPercentage);
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
    const percentage = result.totalQuestions > 0 ? (result.correctAnswers / result.totalQuestions) * 100 : 0;
    const grade = this.getAttestationGrade(percentage);

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
  // Chegaralar to'g'ri javoblar foizi (0-100) bo'yicha — savollar soni 50 dan
  // farq qilsa ham (kam yoki ko'p) to'g'ri ishlashi uchun.
  private getAttestationCategory(percentage: number): TeacherCategory | null {
    if (percentage >= 80) return TeacherCategory.OLIY_TOIFA;
    if (percentage >= 70) return TeacherCategory.BIRINCHI_TOIFA;
    if (percentage >= 60) return TeacherCategory.IKKINCHI_TOIFA;
    if (percentage >= 56) return TeacherCategory.MUTAXASSIS;
    return null;
  }

  private getAttestationGrade(percentage: number): string | null {
    const category = this.getAttestationCategory(percentage);
    if (!category) return null;
    if (percentage >= 86) return 'Oliy toifa + 70% ustama';
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
        satScore: r.satScore,
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
        satScore: r.satScore,
        duration: r.duration,
        finishedAt: r.finishedAt ?? undefined,
        createdAt: r.createdAt,
      };
    });
  }

  // Milliy Sertifikat uchun Rasch balli — talab bo'yicha (on-demand) hisoblanadi,
  // keshlanmaydi. Kohorta kamida MILLIY_SERTIFIKAT_MIN_RESPONDENTS talabaga
  // yetmaguncha ball hisoblanmaydi (statistik ishonchlilik uchun).
  async getMilliySertifikatScore(
    resultId: string,
    userId: string,
    userRole?: string,
  ): Promise<any> {
    const result = await this.resultModel.findById(resultId);
    if (!result) throw new NotFoundException('Result not found');
    if (
      result.userId !== userId &&
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.TEACHER
    ) {
      throw new ForbiddenException();
    }
    if (result.rawPoints == null || result.totalPoints == null) {
      throw new BadRequestException('Bu natija Rasch balliga ega emas');
    }

    const rows = await this.resultModel
      .find(
        { testId: result.testId, resultStatus: ResultStatus.COMPLETED, rawPoints: { $ne: null } },
        { rawPoints: 1, totalPoints: 1, _id: 0 },
      )
      .lean();

    const respondentCount = rows.length;
    // Talabalarga nechta talaba topshirgani ko'rsatilmaydi (akademiya
    // daromadi/talabalar soni sir bo'lishi kerak) — faqat xodimlarga ochiq.
    const isStaff = userRole === UserRole.ADMIN || userRole === UserRole.TEACHER;
    if (respondentCount < MILLIY_SERTIFIKAT_MIN_RESPONDENTS) {
      return {
        ready: false,
        respondentCount: isStaff ? respondentCount : null,
        threshold: MILLIY_SERTIFIKAT_MIN_RESPONDENTS,
        rawPoints: result.rawPoints,
        totalPoints: result.totalPoints,
      };
    }

    const logits = rows.map((r: any) => computeLogit(r.rawPoints, r.totalPoints));
    const { mean, sd } = computeCohortStats(logits);
    const myLogit = computeLogit(result.rawPoints, result.totalPoints);
    const z = sd === 0 ? 0 : (myLogit - mean) / sd;
    const finalScore = 50 + 10 * z;

    return {
      ready: true,
      respondentCount: isStaff ? respondentCount : null,
      threshold: MILLIY_SERTIFIKAT_MIN_RESPONDENTS,
      finalScore,
      grade: getMilliySertifikatGrade(finalScore),
      rawPoints: result.rawPoints,
      totalPoints: result.totalPoints,
    };
  }

  async getTopStudents(period: LeaderboardPeriod): Promise<TopStudentEntry[]> {
    const from = new Date();
    if (period === LeaderboardPeriod.MONTH) {
      from.setDate(from.getDate() - 30);
    } else {
      from.setDate(from.getDate() - 7);
    }

    const rows = await this.resultModel.aggregate([
      { $match: { resultStatus: ResultStatus.COMPLETED, createdAt: { $gte: from } } },
      { $group: { _id: '$userId', avgScore: { $avg: '$score' }, totalTests: { $sum: 1 } } },
      { $sort: { avgScore: -1, totalTests: -1 } },
      { $limit: 20 },
    ]);

    if (rows.length === 0) return [];

    const userIds = rows.map((row) => row._id);
    const users = await this.userModel.find({ _id: { $in: userIds } });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return rows.map((row, i) => {
      const user = userMap.get(row._id);
      const parts = [user?.userName, user?.userLastName].filter(Boolean);
      const userName = parts.length > 0 ? parts.join(' ') : 'Foydalanuvchi';
      return {
        rank: i + 1,
        userId: row._id,
        userName,
        userImage: user?.userImage ?? undefined,
        avgScore: row.avgScore,
        totalTests: row.totalTests,
      };
    });
  }
}
