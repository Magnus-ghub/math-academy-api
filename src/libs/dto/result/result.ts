import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { ResultStatus } from 'src/libs/enums/result.enum';

@ObjectType()
export class AttestationQuestionResult {
  @Field(() => Int)
  orderIndex: number;

  @Field()
  questionId: string;

  @Field()
  isCorrect: boolean;
}

@ObjectType()
export class AttestationSection {
  @Field()
  name: string;

  @Field(() => [AttestationQuestionResult])
  questions: AttestationQuestionResult[];
}

@ObjectType()
export class AttestationData {
  @Field(() => Int)
  totalPoints: number;

  @Field({ nullable: true })
  grade?: string;

  @Field(() => [AttestationSection])
  sections: AttestationSection[];
}

@ObjectType()
export class Result {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field()
  testId: string;

  @Field({ nullable: true })
  testTitle?: string;

  @Field({ nullable: true })
  testType?: string;

  @Field({ nullable: true })
  groupId?: string;

  @Field(() => ResultStatus)
  resultStatus: ResultStatus;

  @Field(() => Int)
  totalQuestions: number;

  @Field(() => Int)
  correctAnswers: number;

  @Field(() => Float)
  score: number;          // foizda, masalan 85.5

  @Field(() => Int, { nullable: true })
  satScore?: number | null; // faqat SAT testlarida — 200-800 shkalalangan Math balli

  @Field(() => Int, { nullable: true })
  rawPoints?: number | null; // faqat MILLIY_SERTIFIKAT — xom ball (0-55)

  @Field(() => Int, { nullable: true })
  totalPoints?: number | null; // faqat MILLIY_SERTIFIKAT — maksimal ball (odatda 55)

  @Field(() => Int)
  duration: number;       // necha soniyada tugatgan

  @Field(() => [AnswerDto])
  answers: AnswerDto[];   // har bir savolga javob

  @Field({ nullable: true })
  finishedAt?: Date;

  @Field()
  createdAt: Date;

  @Field(() => AttestationData, { nullable: true })
  attestationData?: AttestationData;
}

@ObjectType()
export class AnswerDto {
  @Field()
  questionId: string;

  @Field(() => Int)
  selectedAnswer: number;  // talaba tanlagan index

  @Field(() => Int, { nullable: true })
  selectedAnswerB?: number | null; // faqat TWO_PART savollarida

  @Field()
  isCorrect: boolean;

  @Field(() => Boolean, { nullable: true })
  isCorrectB?: boolean | null; // faqat TWO_PART savollarida

  @Field(() => Int)
  timeSpent: number;       // shu savolga sarflangan vaqt (soniya)
}