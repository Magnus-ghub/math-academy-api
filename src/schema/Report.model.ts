import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ReportType, ReportStatus, ReportReason } from '../libs/enums/report.enum';

@Entity('reports')
export class ReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ReportType })
  reportType: ReportType;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  reportStatus: ReportStatus;

  @Column({ type: 'enum', enum: ReportReason })
  reportReason: ReportReason;

  @Column({ nullable: true, type: 'text' })
  reportText: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  questionId: string;

  @Column({ nullable: true })
  testId: string;

  @CreateDateColumn()
  createdAt: Date;
}