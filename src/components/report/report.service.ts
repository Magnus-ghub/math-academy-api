import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportEntity } from '../../schema/Report.model';
import { ReportStatus } from '../../libs/enums/report.enum';
import { ReportInput } from 'src/libs/dto/report/reportInput';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(ReportEntity)
    private reportRepo: Repository<ReportEntity>,
  ) {}

  async createReport(userId: string, input: ReportInput): Promise<ReportEntity> {
    const report = this.reportRepo.create({ ...input, userId });
    return this.reportRepo.save(report);
  }

  async getPendingReports(): Promise<ReportEntity[]> {
    return this.reportRepo.find({
      where: { reportStatus: ReportStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
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