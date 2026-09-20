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

  // Faqat MATCHING turida — guruhdagi barcha savollarga tegishli umumiy shart
  // matni (masalan piramida haqidagi tavsif), har bir alohida savol matnidan
  // ajratilgan holda bitta marta ko'rsatiladi.
  @Prop({ type: String, default: null })
  groupPrompt: string | null;

  @Prop({ type: [String], default: [] })
  options: string[];

  // options bilan bir xil indeksda — variant matni o'rniga/qo'shimcha rasm
  // (masalan SAT'dagi grafik/diagramma variantlari). Bo'sh string = rasm yo'q.
  @Prop({ type: [String], default: [] })
  optionImages: string[];

  @Prop({ type: Number, required: true })
  correctAnswer: number;

  // Faqat TWO_PART turida (Milliy Sertifikat) — ikkinchi mustaqil javob
  @Prop({ type: Number, default: null })
  correctAnswerB: number | null;

  // Faqat TWO_PART turida — admin MathLive orqali kiritgan xom LaTeX ifoda
  // (masalan "\frac{9-3\sqrt{5}}{2}"), baholashda ISHLATILMAYDI (shu uchun
  // correctAnswer/correctAnswerB bor), faqat tahrirlashda qayta ko'rsatish
  // uchun saqlanadi — aks holda ×100 kodlangan sondan asl ifodani tiklab
  // bo'lmaydi.
  @Prop({ type: String, default: null })
  correctAnswerText: string | null;

  @Prop({ type: String, default: null })
  correctAnswerBText: string | null;

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
