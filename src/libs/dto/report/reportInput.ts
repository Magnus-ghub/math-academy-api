import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReportReason, ReportType } from '../../enums/report.enum';

@InputType()
export class ReportInput {
  @Field(() => ReportType)
  @IsEnum(ReportType)
  reportType: ReportType;

  @Field(() => ReportReason)
  @IsEnum(ReportReason)
  reportReason: ReportReason;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  reportText?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  questionId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  testId?: string;
}