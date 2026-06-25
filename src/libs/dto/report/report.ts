import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { ReportType, ReportStatus, ReportReason } from '../../enums/report.enum';

@ObjectType()
export class Report {
  @Field(() => ID)
  id: string;

  @Field(() => ReportType)
  reportType: ReportType;

  @Field(() => ReportStatus)
  reportStatus: ReportStatus;

  @Field(() => ReportReason)
  reportReason: ReportReason;

  @Field({ nullable: true })
  reportText?: string;

  @Field()
  userId: string;

  @Field({ nullable: true })
  questionId?: string;

  @Field({ nullable: true })
  testId?: string;

  @Field({ nullable: true })
  testTitle?: string;

  @Field(() => Int, { nullable: true })
  questionOrder?: number;

  @Field()
  createdAt: Date;
}