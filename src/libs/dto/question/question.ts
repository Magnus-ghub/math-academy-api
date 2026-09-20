import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { QuestionType } from 'src/libs/enums/question.enum';

@ObjectType()
export class Question {
  @Field(() => ID)
  id: string;

  @Field(() => QuestionType)
  questionType: QuestionType;

  @Field()
  testId: string;

  @Field()
  questionText: string;

  @Field({ nullable: true })
  questionImage?: string;

  @Field({ nullable: true })
  section?: string;

  @Field({ nullable: true })
  groupPrompt?: string;

  @Field(() => [String])
  options: string[]; // A, B, C, D variantlar

  @Field(() => [String], { nullable: true })
  optionImages?: string[]; // options bilan bir xil indeksda, bo'sh string = rasm yo'q

  // Talaba hali testni tugatmagan bo'lsa null qaytadi (getQuestionsByTest) —
  // javob kaliti imtihon paytida clientga sizib chiqmasligi uchun.
  @Field(() => Int, { nullable: true })
  correctAnswer?: number | null; // 0, 1, 2, 3 (index)

  // Faqat TWO_PART turida — ikkinchi mustaqil javob (Milliy Sertifikat)
  @Field(() => Int, { nullable: true })
  correctAnswerB?: number | null;

  // Faqat TWO_PART turida — admin MathLive orqali kiritgan xom LaTeX ifoda,
  // faqat tahrirlashda qayta ko'rsatish uchun (baholashda ishlatilmaydi).
  // Tip funksiyasi ANIQ ko'rsatilishi shart — "string | null" union tipini
  // NestJS GraphQL avtomatik chiqara olmaydi (UndefinedTypeError berib
  // ilova ishga tushmay qoladi).
  @Field(() => String, { nullable: true })
  correctAnswerText?: string | null;

  @Field(() => String, { nullable: true })
  correctAnswerBText?: string | null;

  @Field({ nullable: true })
  explanation?: string;

  @Field({ nullable: true })
  youtubeUrl?: string;

  @Field({ nullable: true })
  analysis?: string;

  @Field(() => Int)
  orderIndex: number; // testdagi tartib raqami

  @Field()
  createdAt: Date;
}
