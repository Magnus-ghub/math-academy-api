import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ResultStatus } from '../libs/enums/result.enum';

@Schema({ _id: false })
export class ResultAnswer {
  @Prop({ type: String, required: true })
  questionId: string;

  @Prop({ type: Number, required: true })
  selectedAnswer: number;

  @Prop({ type: Boolean, required: true })
  isCorrect: boolean;

  @Prop({ type: Number, required: true })
  timeSpent: number;
}

export const ResultAnswerSchema = SchemaFactory.createForClass(ResultAnswer);

export type ResultDocument = HydratedDocument<ResultEntity>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'results',
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
})
export class ResultEntity {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  testId: string;

  @Prop({ type: String, default: null })
  groupId: string | null;

  @Prop({ enum: Object.values(ResultStatus), type: String, default: ResultStatus.IN_PROGRESS })
  resultStatus: ResultStatus;

  @Prop({ type: Number, default: 0 })
  totalQuestions: number;

  @Prop({ type: Number, default: 0 })
  correctAnswers: number;

  @Prop({ type: Number, default: 0 })
  score: number;

  // Faqat SAT turidagi testlar uchun — 200-800 shkalalangan Math balli.
  // Boshqa test turlarida null bo'lib qoladi.
  @Prop({ type: Number, default: null })
  satScore: number | null;

  @Prop({ type: Number, default: 0 })
  duration: number;

  @Prop({ type: [ResultAnswerSchema], default: null })
  answers: ResultAnswer[] | null;

  @Prop({ type: Date, default: null })
  finishedAt: Date | null;

  createdAt: Date;
}

export const ResultSchema = SchemaFactory.createForClass(ResultEntity);

ResultSchema.index({ userId: 1, testId: 1, resultStatus: 1 });
ResultSchema.index({ testId: 1, resultStatus: 1, score: -1, duration: 1 });
ResultSchema.index({ userId: 1, createdAt: -1 });
