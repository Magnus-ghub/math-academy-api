import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PubSub } from 'graphql-subscriptions';
import { ReportEntity } from '../../schema/Report.model';
import { ReportStatus } from '../../libs/enums/report.enum';
import { ReportInput } from 'src/libs/dto/report/reportInput';
import { TestEntity } from '../../schema/Test.model';
import { QuestionEntity } from '../../schema/Question.model';

export const REPORT_CREATED = 'REPORT_CREATED';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(ReportEntity)
    private reportRepo: Repository<ReportEntity>,
    @InjectRepository(TestEntity)
    private testRepo: Repository<TestEntity>,
    @InjectRepository(QuestionEntity)
    private questionRepo: Repository<QuestionEntity>,
    @Inject('PUB_SUB') private pubSub: PubSub,
  ) {}

  async createReport(userId: string, input: ReportInput): Promise<ReportEntity> {
    const report = this.reportRepo.create({ ...input, userId });
    const saved = await this.reportRepo.save(report);
    await this.pubSub.publish(REPORT_CREATED, { reportCreated: saved });
    return saved;
  }

  async getPendingReports(): Promise<any[]> {
    const reports = await this.reportRepo.find({
      where: { reportStatus: ReportStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    const testIds = [...new Set(reports.map((r) => r.testId).filter(Boolean))];
    const questionIds = [...new Set(reports.map((r) => r.questionId).filter(Boolean))];

    const [tests, questions] = await Promise.all([
      testIds.length ? this.testRepo.find({ where: { id: In(testIds) } }) : [],
      questionIds.length ? this.questionRepo.find({ where: { id: In(questionIds) } }) : [],
    ]);

    const testMap = new Map<string, string>(tests.map((t) => [t.id, t.testTitle] as [string, string]));
    const questionMap = new Map<string, number>(questions.map((q) => [q.id, q.orderIndex] as [string, number]));

    return reports.map((r) => ({
      ...r,
      testTitle: r.testId ? testMap.get(r.testId) ?? null : null,
      questionOrder: r.questionId ? (questionMap.get(r.questionId) ?? null) : null,
    }));
  }

  async resolveReport(reportId: string): Promise<ReportEntity> {
    await this.reportRepo.update(reportId, { reportStatus: ReportStatus.RESOLVED });
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async rejectReport(reportId: string): Promise<ReportEntity> {
    await this.reportRepo.update(reportId, { reportStatus: ReportStatus.REJECTED });
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async getReportsByQuestion(questionId: string): Promise<ReportEntity[]> {
    return this.reportRepo.find({
      where: { questionId },
      order: { createdAt: 'DESC' },
    });
  }
}