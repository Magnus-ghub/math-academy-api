import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PubSub } from 'graphql-subscriptions';
import { ReportEntity, ReportDocument } from '../../schema/Report.model';
import { ReportStatus } from '../../libs/enums/report.enum';
import { ReportInput } from 'src/libs/dto/report/reportInput';
import { TestEntity, TestDocument } from '../../schema/Test.model';
import { QuestionEntity, QuestionDocument } from '../../schema/Question.model';

export const REPORT_CREATED = 'REPORT_CREATED';

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(ReportEntity.name)
    private reportModel: Model<ReportDocument>,
    @InjectModel(TestEntity.name)
    private testModel: Model<TestDocument>,
    @InjectModel(QuestionEntity.name)
    private questionModel: Model<QuestionDocument>,
    @Inject('PUB_SUB') private pubSub: PubSub,
  ) {}

  async createReport(userId: string, input: ReportInput): Promise<ReportDocument> {
    const saved = await this.reportModel.create({ ...input, userId });
    await this.pubSub.publish(REPORT_CREATED, { reportCreated: saved });
    return saved;
  }

  async getPendingReports(): Promise<any[]> {
    const reports = await this.reportModel.find({ reportStatus: ReportStatus.PENDING }).sort({ createdAt: -1 });

    const testIds = [...new Set(reports.map((r) => r.testId).filter(Boolean))];
    const questionIds = [...new Set(reports.map((r) => r.questionId).filter(Boolean))];

    const [tests, questions] = await Promise.all([
      testIds.length ? this.testModel.find({ _id: { $in: testIds } }) : [],
      questionIds.length ? this.questionModel.find({ _id: { $in: questionIds } }) : [],
    ]);

    const testMap = new Map<string, string>(tests.map((t) => [t.id, t.testTitle] as [string, string]));
    const questionMap = new Map<string, number>(questions.map((q) => [q.id, q.orderIndex] as [string, number]));

    return reports.map((r) => ({
      ...r.toObject(),
      testTitle: r.testId ? testMap.get(r.testId) ?? null : null,
      questionOrder: r.questionId ? (questionMap.get(r.questionId) ?? null) : null,
    }));
  }

  async resolveReport(reportId: string): Promise<ReportDocument> {
    const report = await this.reportModel.findByIdAndUpdate(
      reportId,
      { $set: { reportStatus: ReportStatus.RESOLVED } },
      { new: true },
    );
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async rejectReport(reportId: string): Promise<ReportDocument> {
    const report = await this.reportModel.findByIdAndUpdate(
      reportId,
      { $set: { reportStatus: ReportStatus.REJECTED } },
      { new: true },
    );
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async getReportsByQuestion(questionId: string): Promise<ReportDocument[]> {
    return this.reportModel.find({ questionId }).sort({ createdAt: -1 });
  }
}
