import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, IsArray } from 'class-validator';

@InputType()
export class QuestionUpdate {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  questionText?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  questionImage?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  options?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  optionImages?: string[];

  // Max(3) qo'yilmaydi — MATCHING savollarda javob banki 4 tadan ko'p
  // (masalan A-F, 6 ta) bo'lishi mumkin, correctAnswer shu bankdagi indeks.
  // Min ham qo'yilmaydi — TWO_PART javobi ×100 kodlangan son, manfiy bo'lishi
  // mumkin (masalan -3 → -300).
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  correctAnswer?: number;

  // Faqat TWO_PART turida ishlatiladi (Milliy Sertifikat) — ikkinchi mustaqil javob
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  correctAnswerB?: number;

  // Faqat TWO_PART turida — admin MathLive orqali kiritgan xom LaTeX ifoda
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  correctAnswerText?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  correctAnswerBText?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  explanation?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  youtubeUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  analysis?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  section?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  groupPrompt?: string;
}
