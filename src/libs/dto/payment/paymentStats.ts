import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class ProviderBreakdown {
  @Field()
  provider: string;

  @Field(() => Int)
  count: number;

  @Field(() => Int)
  amount: number;
}

@ObjectType()
export class DailyRevenuePoint {
  @Field()
  date: string; // YYYY-MM-DD

  @Field(() => Int)
  amount: number;
}

@ObjectType()
export class TopTest {
  @Field()
  testId: string;

  @Field()
  testTitle: string;

  @Field(() => Int)
  count: number;

  @Field(() => Int)
  revenue: number;
}

@ObjectType()
export class PaymentStats {
  // Sof daromad — CONFIRMED, TOPUP kirmaydi (xarajat qilingan paytda hisoblanadi)
  @Field(() => Int)
  netRevenue: number;

  // Balansga tasdiqlangan holda kirgan jami pul (TOPUP, CONFIRMED)
  @Field(() => Int)
  totalTopupConfirmed: number;

  // Click orqali to'ldirishlarda ushlab qolingan komissiya jami
  @Field(() => Int)
  totalClickCommission: number;

  // Talabalar balansida hali ishlatilmagan pul jami — kelajakdagi majburiyat
  @Field(() => Int)
  outstandingBalance: number;

  // Kamida bitta CONFIRMED to'lovi bo'lgan noyob talabalar soni
  @Field(() => Int)
  uniquePayingUsers: number;

  @Field(() => Int)
  pendingCount: number;

  // PENDING dan CONFIRMED gacha o'rtacha kutish vaqti (soatda)
  @Field(() => Float, { nullable: true })
  avgConfirmHours?: number;

  // Balansga pul kirish yo'li — TOPUP, CONFIRMED bo'yicha provider kesimi
  @Field(() => [ProviderBreakdown])
  providerBreakdown: ProviderBreakdown[];

  // Oxirgi 14 kunlik sof daromad trendi
  @Field(() => [DailyRevenuePoint])
  dailyRevenue: DailyRevenuePoint[];

  // Eng ko'p daromad keltirgan testlar (top 5)
  @Field(() => [TopTest])
  topTests: TopTest[];
}
