import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportService } from './report.service';
import { ReportResolver } from './report.resolver';
import { ReportEntity } from '../../schema/Report.model';

@Module({
  imports: [TypeOrmModule.forFeature([ReportEntity])],
  providers: [ReportService, ReportResolver],
  exports: [ReportService],
})
export class ReportModule {}