import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ReportType, ReportStatus, ReportReason } from '../libs/enums/report.enum';

export type ReportDocument = HydratedDocument<ReportEntity>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'reports',
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
})
export class ReportEntity {
  @Prop({ enum: Object.values(ReportType), type: String, required: true })
  reportType: ReportType;

  @Prop({ enum: Object.values(ReportStatus), type: String, default: ReportStatus.PENDING })
  reportStatus: ReportStatus;

  @Prop({ enum: Object.values(ReportReason), type: String, required: true })
  reportReason: ReportReason;

  @Prop({ type: String, default: null })
  reportText: string | null;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, default: null })
  questionId: string | null;

  @Prop({ type: String, default: null })
  testId: string | null;

  @Prop({ type: String, default: null })
  adminReply: string | null;

  // Talaba yuborgan paytda ko'rishga hojat yo'q (o'zi yuborgan) — admin hal/rad
  // etganda false qilinadi, talaba "Mening e'tirozlarim" sahifasini ochsa true
  // qaytariladi. Header'dagi bildirishnoma raqami shunga qarab hisoblanadi.
  @Prop({ type: Boolean, default: true })
  studentSeen: boolean;

  createdAt: Date;
}

export const ReportSchema = SchemaFactory.createForClass(ReportEntity);

ReportSchema.index({ reportStatus: 1, createdAt: -1 });
ReportSchema.index({ questionId: 1, createdAt: -1 });
