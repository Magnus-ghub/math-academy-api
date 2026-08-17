import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  PaymentProvider,
  PaymentStatus,
  PaymentType,
} from '../libs/enums/payment.enum';

export type PaymentDocument = HydratedDocument<PaymentEntity>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'payments',
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
})
export class PaymentEntity {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, default: null })
  groupId: string | null;

  @Prop({ type: String, default: null })
  testId: string | null;

  @Prop({ type: String, default: null })
  testTitle: string | null;

  @Prop({ enum: Object.values(PaymentType), type: String, required: true })
  paymentType: PaymentType;

  @Prop({ enum: Object.values(PaymentProvider), type: String, required: true })
  paymentProvider: PaymentProvider;

  @Prop({
    enum: Object.values(PaymentStatus),
    type: String,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Prop({ type: Number, required: true })
  amount: number;

  // TOPUP + CLICK uchun — CLICK komissiyasi (sof tushum = amount - platformFee)
  @Prop({ type: Number, default: null })
  platformFee: number | null;

  @Prop({ type: String, default: null })
  clickTransactionId: string | null;

  // MANUAL oqimda talaba yuklagan chek rasmi
  @Prop({ type: String, default: null })
  receiptUrl: string | null;

  // Talabaning ixtiyoriy izohi (masalan, nega qo'lda to'lamoqchi ekani)
  @Prop({ type: String, default: null })
  studentNote: string | null;

  // Admin javobi — tasdiqlash/rad etish sababi, Telegram orqali talabaga yuboriladi
  @Prop({ type: String, default: null })
  adminReply: string | null;

  @Prop({ type: Date, default: null })
  confirmedAt: Date | null;

  @Prop({ type: String, default: null })
  confirmedBy: string | null;

  createdAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(PaymentEntity);

PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ paymentStatus: 1, createdAt: -1 });
PaymentSchema.index({ clickTransactionId: 1 });
PaymentSchema.index({ userId: 1, testId: 1, paymentStatus: 1 });
PaymentSchema.index({ testId: 1, paymentStatus: 1 });
