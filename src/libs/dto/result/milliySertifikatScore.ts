import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class MilliySertifikatScoreResult {
  @Field()
  ready: boolean;

  // Faqat ADMIN/TEACHER uchun to'ldiriladi — talabalarga qancha talaba
  // topshirgani (demak, akademiya daromadi) ko'rsatilmasligi kerak.
  @Field(() => Int, { nullable: true })
  respondentCount?: number | null;

  @Field(() => Int)
  threshold: number;

  @Field(() => Float, { nullable: true })
  finalScore?: number | null;

  @Field(() => String, { nullable: true })
  grade?: string | null;

  @Field(() => Int, { nullable: true })
  rawPoints?: number | null;

  @Field(() => Int, { nullable: true })
  totalPoints?: number | null;
}
