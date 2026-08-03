import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TestType, TestAccess, TestStatus, TestBlock, DTMType, TestDifficulty } from '../libs/enums/test.enum';

export type TestDocument = HydratedDocument<TestEntity>;

@Schema({ timestamps: true, collection: 'tests', toObject: { virtuals: true }, toJSON: { virtuals: true } })
export class TestEntity {
  @Prop({ enum: Object.values(TestType), type: String, required: true })
  testType: TestType;

  @Prop({ enum: Object.values(TestAccess), type: String, default: TestAccess.PUBLIC })
  testAccess: TestAccess;

  @Prop({ enum: Object.values(TestStatus), type: String, default: TestStatus.DRAFT })
  testStatus: TestStatus;

  @Prop({ enum: Object.values(TestBlock), type: String, default: null })
  testBlock: TestBlock | null;

  @Prop({ enum: Object.values(DTMType), type: String, default: null })
  dtmType: DTMType | null;

  @Prop({ enum: Object.values(TestDifficulty), type: String, default: TestDifficulty.STANDART })
  testDifficulty: TestDifficulty;

  @Prop({ type: String, required: true })
  testTitle: string;

  @Prop({ type: String, default: null })
  testDesc: string | null;

  @Prop({ type: String, default: null })
  testImage: string | null;

  @Prop({ type: String, default: null })
  testPdfUrl: string | null;

  @Prop({ type: String, default: null })
  testYoutubeUrl: string | null;

  @Prop({ type: String, default: null })
  testAnalysis: string | null;

  @Prop({ type: Number, required: true })
  duration: number;

  @Prop({ type: Number, default: 0 })
  totalQuestions: number;

  @Prop({ type: Number, default: 0 })
  totalAttempts: number;

  @Prop({ type: String, default: null })
  groupId: string | null;

  @Prop({ type: Number, default: null })
  testPrice: number | null;

  @Prop({ type: String, required: true })
  createdBy: string;

  // null = doimiy ochiq. Belgilangan bo'lsa, shu vaqtdan keyin kunlik cron
  // (TestsService.closeExpiredTests) testni avtomatik ARCHIVED qiladi.
  @Prop({ type: Date, default: null })
  closesAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const TestSchema = SchemaFactory.createForClass(TestEntity);

TestSchema.index({ testStatus: 1, createdAt: -1 });
TestSchema.index({ groupId: 1, testStatus: 1, createdAt: -1 });
