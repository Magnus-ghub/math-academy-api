import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { QuestionType } from '../libs/enums/question.enum';

export type QuestionDocument = HydratedDocument<QuestionEntity>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'questions',
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
})
export class QuestionEntity {
  @Prop({ type: String, required: true })
  testId: string;

  @Prop({ enum: Object.values(QuestionType), type: String, default: QuestionType.SINGLE })
  questionType: QuestionType;

  @Prop({ type: String, required: true })
  questionText: string;

  @Prop({ type: String, default: null })
  questionImage: string | null;

  @Prop({ type: String, default: null })
  section: string | null;

  @Prop({ type: [String], default: [] })
  options: string[];

  @Prop({ type: Number, required: true })
  correctAnswer: number;

  @Prop({ type: String, default: null })
  explanation: string | null;

  @Prop({ type: String, default: null })
  youtubeUrl: string | null;

  @Prop({ type: String, default: null })
  analysis: string | null;

  @Prop({ type: Number, required: true })
  orderIndex: number;

  createdAt: Date;
}

export const QuestionSchema = SchemaFactory.createForClass(QuestionEntity);

QuestionSchema.index({ testId: 1, orderIndex: 1 });
