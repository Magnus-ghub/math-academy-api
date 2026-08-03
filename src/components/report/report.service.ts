import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PubSub } from 'graphql-subscriptions';
import { ReportEntity, ReportDocument } from '../../schema/Report.model';
import { ReportStatus, ReportType, ReportReason } from '../../libs/enums/report.enum';
import { ReportInput } from 'src/libs/dto/report/reportInput';
import { TestEntity, TestDocument } from '../../schema/Test.model';
import { QuestionEntity, QuestionDocument } from '../../schema/Question.model';
import { UserEntity, UserDocument } from '../../schema/User.model';
import { ResultsService } from '../results/results.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';

export const REPORT_CREATED = 'REPORT_CREATED';

const REASON_LABELS: Record<string, string> = {
  WRONG_ANSWER: "Noto'g'ri javob",
  WRONG_QUESTION: "Noto'g'ri savol",
  TYPO: 'Imlo xatosi',
  UNCLEAR: 'Tushunarsiz',
  RETAKE_REQUEST: "Qayta topshirish so'rovi",
  OTHER: 'Boshqa',
};

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(ReportEntity.name)
    private reportModel: Model<ReportDocument>,
    @InjectModel(TestEntity.name)
    private testModel: Model<TestDocument>,
    @InjectModel(QuestionEntity.name)
    private questionModel: Model<QuestionDocument>,
    @InjectModel(UserEntity.name)
    private userModel: Model<UserDocument>,
    private resultsService: ResultsService,
    private telegramBotService: TelegramBotService,
    @Inject('PUB_SUB') private pubSub: PubSub,
  ) {}

  async createReport(userId: string, input: ReportInput): Promise<ReportDocument> {
    const saved = await this.reportModel.create({ ...input, userId });
    await this.pubSub.publish(REPORT_CREATED, { reportCreated: saved });
    return saved;
  }

  async getPendingReports(): Promise<any[]> {
    const reports = await this.reportModel.find({ reportStatus: ReportStatus.PENDING }).sort({ createdAt: -1 });
    return this.enrichReports(reports);
  }

  // Talaba o'zining yuborgan reportlarini (admin javobi bilan) ko'rishi uchun
  async getMyReports(userId: string): Promise<any[]> {
    const reports = await this.reportModel.find({ userId }).sort({ createdAt: -1 });
    return this.enrichReports(reports);
  }

  private async enrichReports(reports: ReportDocument[]): Promise<any[]> {
    const testIds = [...new Set(reports.map((r) => r.testId).filter(Boolean))];
    const questionIds = [...new Set(reports.map((r) => r.questionId).filter(Boolean))];
    const userIds = [...new Set(reports.map((r) => r.userId).filter(Boolean))];

    const [tests, questions, users] = await Promise.all([
      testIds.length ? this.testModel.find({ _id: { $in: testIds } }) : [],
      questionIds.length ? this.questionModel.find({ _id: { $in: questionIds } }) : [],
      userIds.length ? this.userModel.find({ _id: { $in: userIds } }) : [],
    ]);

    const testMap = new Map<string, string>(tests.map((t) => [t.id, t.testTitle] as [string, string]));
    const questionMap = new Map<string, number>(questions.map((q) => [q.id, q.orderIndex] as [string, number]));
    const userMap = new Map<string, UserDocument>(users.map((u) => [u.id, u] as [string, UserDocument]));

    return reports.map((r) => {
      const user = userMap.get(r.userId);
      return {
        ...r.toObject(),
        testTitle: r.testId ? testMap.get(r.testId) ?? null : null,
        questionOrder: r.questionId ? (questionMap.get(r.questionId) ?? null) : null,
        userName: user?.userName ?? null,
        userLastName: user?.userLastName ?? null,
      };
    });
  }

  async resolveReport(reportId: string, adminReply?: string): Promise<ReportDocument> {
    const report = await this.reportModel.findById(reportId);
    if (!report) throw new NotFoundException('Report not found');

    // Talaba "qayta topshirishga ruxsat so'rash" reporti yuborgan bo'lsa,
    // admin uni hal qilgani hamon eski urinish o'chiriladi va talaba darhol
    // testni qayta topshira oladi — alohida amal talab qilinmaydi.
    if (report.reportType === ReportType.TEST && report.reportReason === ReportReason.RETAKE_REQUEST && report.testId) {
      await this.resultsService.resetAttempt(report.userId, report.testId);
    }

    report.reportStatus = ReportStatus.RESOLVED;
    report.adminReply = adminReply ?? null;
    report.studentSeen = false;
    await report.save();

    await this.notifyReportOutcome(report, true);
    return report;
  }

  async rejectReport(reportId: string, adminReply?: string): Promise<ReportDocument> {
    const report = await this.reportModel.findByIdAndUpdate(
      reportId,
      { $set: { reportStatus: ReportStatus.REJECTED, adminReply: adminReply ?? null, studentSeen: false } },
      { new: true },
    );
    if (!report) throw new NotFoundException('Report not found');

    await this.notifyReportOutcome(report, false);
    return report;
  }

  // Report hal/rad etilgach, talabaga Telegram orqali chiroyli xabar yuboradi
  private async notifyReportOutcome(report: ReportDocument, resolved: boolean): Promise<void> {
    const user = await this.userModel.findById(report.userId);
    if (!user?.telegramId) return;

    const reasonLabel = REASON_LABELS[report.reportReason] ?? report.reportReason;
    const header = resolved
      ? "✅ <b>E'tirozingiz ko'rib chiqildi!</b>"
      : "❌ <b>E'tirozingiz rad etildi</b>";

    const lines = [header, '', `📝 Mavzu: ${reasonLabel}`];
    if (report.reportText) lines.push(`💭 Sizning xabaringiz: "${report.reportText}"`);
    if (report.adminReply) lines.push('', `💬 Admin javobi:\n${report.adminReply}`);
    if (resolved && report.reportReason === ReportReason.RETAKE_REQUEST) {
      lines.push('', "🔄 Testni endi qayta topshirishingiz mumkin.");
    }

    await this.telegramBotService.notifyUser(user.telegramId, lines.join('\n'));
  }

  async getReportsByQuestion(questionId: string): Promise<ReportDocument[]> {
    return this.reportModel.find({ questionId }).sort({ createdAt: -1 });
  }

  // Header'dagi bildirishnoma raqami uchun — admin javob bergan, talaba hali
  // ko'rmagan reportlar soni
  async getUnseenReportsCount(userId: string): Promise<number> {
    return this.reportModel.countDocuments({ userId, studentSeen: false });
  }

  // Talaba "Mening e'tirozlarim" sahifasini ochganda chaqiriladi
  async markReportsSeen(userId: string): Promise<boolean> {
    await this.reportModel.updateMany({ userId, studentSeen: false }, { $set: { studentSeen: true } });
    return true;
  }
}
