import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PaymentProvider, PaymentStatus, PaymentType } from '../libs/enums/payment.enum';

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

  @Prop({ enum: Object.values(PaymentType), type: String, required: true })
  paymentType: PaymentType;

  @Prop({ enum: Object.values(PaymentProvider), type: String, required: true })
  paymentProvider: PaymentProvider;

  @Prop({ enum: Object.values(PaymentStatus), type: String, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, default: null })
  clickTransactionId: string | null;

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
