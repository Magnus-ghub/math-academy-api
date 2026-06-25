import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ResultEntity } from '../../schema/Result.model';
import { TestEntity } from '../../schema/Test.model';
import { QuestionEntity } from '../../schema/Question.model';
import { ResultInput } from '../../libs/dto/result/resultInput';
import { ResultStatus } from '../../libs/enums/result.enum';
import { TestType } from '../../libs/enums/test.enum';

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(ResultEntity)
    private resultRepo: Repository<ResultEntity>,

    @InjectRepository(TestEntity)
    private testRepo: Repository<TestEntity>,

    @InjectRepository(QuestionEntity)
    private questionRepo: Repository<QuestionEntity>,
  ) {}

  async submitTest(userId: string, input: ResultInput): Promise<ResultEntity> {
    const test = await this.testRepo.findOne({ where: { id: input.testId } });
    if (!test) throw new NotFoundException('Test not found');

    const questions = await this.questionRepo.find({
      where: { testId: input.testId },
    });

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

    const result = this.resultRepo.create({
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

    // Test attempt count oshirish
    await this.testRepo.increment({ id: input.testId }, 'totalAttempts', 1);

    return this.resultRepo.save(result);
  }

  async getMyResults(userId: string): Promise<any[]> {
    const results = await this.resultRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const testIds = [...new Set(results.map((r) => r.testId))];
    const tests = await this.testRepo.findBy({ id: In(testIds) });
    const testMap = new Map<string, TestEntity>(tests.map((t) => [t.id, t]));

    return results.map((r) => ({
      ...r,
      testTitle: testMap.get(r.testId)?.testTitle ?? null,
      testType: testMap.get(r.testId)?.testType ?? null,
    }));
  }

  async getResultById(resultId: string): Promise<any> {
    const result = await this.resultRepo.findOne({ where: { id: resultId } });
    if (!result) throw new NotFoundException('Result not found');
    const test = await this.testRepo.findOne({ where: { id: result.testId } });

    const base = {
      ...result,
      testTitle: test?.testTitle ?? null,
      testType: test?.testType ?? null,
    };

    if (test?.testType !== TestType.ATTESTATSIYA) return base;

    const questions = await this.questionRepo.find({
      where: { testId: result.testId },
      order: { orderIndex: 'ASC' },
    });

    const questionMap = new Map(questions.map((q) => [q.id, q]));
    const totalPoints = result.correctAnswers * 2;
    const grade = this.getAttestationGrade(totalPoints);

    const sectionOrder: string[] = [];
    const sectionMap = new Map<string, { orderIndex: number; questionId: string; isCorrect: boolean }[]>();

    for (const answer of result.answers) {
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

  private getAttestationGrade(points: number): string | null {
    if (points > 86) return 'Oliy toifa + 70% ustama';
    if (points >= 80) return 'Oliy toifa';
    if (points >= 71) return 'Birinchi toifa';
    if (points >= 61) return 'Ikkinchi toifa';
    if (points >= 56) return 'Mutaxassis';
    return null;
  }

  async getLeaderboard(testId: string): Promise<ResultEntity[]> {
    return this.resultRepo.find({
      where: { testId, resultStatus: ResultStatus.COMPLETED },
      order: { score: 'DESC', duration: 'ASC' },
      take: 10,
    });
  }

  async getGlobalLeaderboard(): Promise<any[]> {
    return this.resultRepo
      .createQueryBuilder('result')
      .select('result.userId', 'userId')
      .addSelect('AVG(result.score)', 'avgScore')
      .addSelect('COUNT(result.id)', 'totalTests')
      .where('result.resultStatus = :status', { status: ResultStatus.COMPLETED })
      .groupBy('result.userId')
      .orderBy('avgScore', 'DESC')
      .take(20)
      .getRawMany();
  }
}