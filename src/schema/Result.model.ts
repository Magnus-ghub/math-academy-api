import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ResultStatus, ResultSource } from '../libs/enums/result.enum';

@Schema({ _id: false })
export class ResultAnswer {
  @Prop({ type: String, required: true })
  questionId: string;

  @Prop({ type: Number, required: true })
  selectedAnswer: number;

  // Faqat TWO_PART turida (Milliy Sertifikat) — ikkinchi mustaqil javob
  @Prop({ type: Number, default: null })
  selectedAnswerB: number | null;

  @Prop({ type: Boolean, required: true })
  isCorrect: boolean;

  @Prop({ type: Boolean, default: null })
  isCorrectB: boolean | null;

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

  // Faqat MILLIY_SERTIFIKAT turida — Rasch hisob-kitobi uchun xom ball va
  // shu urinishdagi maksimal ball (topshirish vaqtida "suratga olinadi",
  // testning savollari keyinchalik o'zgarsa ham bu qiymatlar o'zgarmaydi).
  @Prop({ type: Number, default: null })
  rawPoints: number | null;

  @Prop({ type: Number, default: null })
  totalPoints: number | null;

  @Prop({ type: Number, default: 0 })
  duration: number;

  @Prop({ type: [ResultAnswerSchema], default: null })
  answers: ResultAnswer[] | null;

  @Prop({ type: Date, default: null })
  finishedAt: Date | null;

  // Milliy Sertifikat uchun eski Excel-metodologiyadan Rasch kogortasini
  // boyitish maqsadida import qilingan tarixiy natijalarni talabaning
  // haqiqiy platforma urinishlaridan ajratish uchun (userId sintetik,
  // haqiqiy User hujjatiga bog'lanmaydi) — talaba/admin ko'rinishlarida
  // (natijalar jadvali, reyting) chiqarib tashlanadi, faqat Rasch kogorta
  // hisobida ishtirok etadi.
  @Prop({ enum: Object.values(ResultSource), type: String, default: ResultSource.PLATFORM })
  source: ResultSource;

  createdAt: Date;
}

export const ResultSchema = SchemaFactory.createForClass(ResultEntity);

ResultSchema.index({ userId: 1, testId: 1, resultStatus: 1 });
ResultSchema.index({ testId: 1, resultStatus: 1, score: -1, duration: 1 });
ResultSchema.index({ userId: 1, createdAt: -1 });
