import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as mammoth from 'mammoth';
import * as fs from 'fs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QuestionEntity, QuestionDocument } from '../../schema/Question.model';
import { TestEntity, TestDocument } from '../../schema/Test.model';
import { TestAccess, TestType } from '../../libs/enums/test.enum';

@Controller('upload')
export class UploadController {
  constructor(
    @InjectModel(QuestionEntity.name)
    private questionModel: Model<QuestionDocument>,
    @InjectModel(TestEntity.name)
    private testModel: Model<TestDocument>,
  ) {}

  @Post('pdf')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + '.pdf');
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Faqat PDF fayl qabul qilinadi'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadPdf(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fayl yuklanmadi');
    return {
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size,
    };
  }

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new BadRequestException('Faqat rasm fayllari'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fayl yuklanmadi');
    return {
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size,
    };
  }

  @Post('docx-test')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.docx$/)) {
          return cb(new BadRequestException('Faqat .docx fayl'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadDocxTest(
    @UploadedFile() file: Express.Multer.File,
    @Body('testId') testId: string,
  ) {
    if (!file) throw new BadRequestException('Fayl yuklanmadi');
    if (!testId) throw new BadRequestException('testId kerak');

    const test = await this.testModel.findById(testId);
    if (!test) throw new BadRequestException('Test topilmadi');

    // docx ni text ga o'girish
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    const text = result.value;

    // Savollarni parse qilish
    const questions = this.parseQuestions(text);

    if (questions.length === 0) {
      throw new BadRequestException('Savollar topilmadi. Format: 1. Savol\nA) ...\nB) ...\nC) ...\nD) ...*');
    }

    // DB ga saqlash
    let savedCount = 0;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await this.questionModel.create({
        testId,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        orderIndex: i + 1,
      });
      savedCount++;
    }

    // totalQuestions yangilash
    await this.testModel.updateOne({ _id: testId }, { $set: { totalQuestions: savedCount } });

    return {
      success: true,
      totalQuestions: savedCount,
      message: `${savedCount} ta savol muvaffaqiyatli yuklandi`,
    };
  }

  @Post('json-test')
  @UseGuards(JwtAuthGuard)
  async uploadJsonTest(
    @Body() body: {
      testId?: string;
      testTitle?: string;
      testType?: string;
      testAccess?: string;
      duration?: number;
      groupId?: string;
      testDesc?: string;
      testYoutubeUrl?: string;
      testAnalysis?: string;
      createdBy?: string;
      replace?: boolean;
      questions: {
        questionText: string;
        questionImage?: string;
        options: string[];
        correctAnswer: number;
        explanation?: string;
        youtubeUrl?: string;
        analysis?: string;
      }[];
    },
  ) {
    if (!body.questions || !Array.isArray(body.questions) || body.questions.length === 0) {
      throw new BadRequestException('questions massivi bo\'sh');
    }

    let testId = body.testId;
    let existingByOrder: Map<number, QuestionDocument> | null = null;

    // testId berilmagan bo'lsa yangi test yaratamiz
    if (!testId) {
      if (!body.testTitle) throw new BadRequestException('testTitle kerak');
      const saved = await this.testModel.create({
        testTitle: body.testTitle,
        testType: (body.testType as TestType) || TestType.DTM,
        testAccess: (body.testAccess as TestAccess) || TestAccess.PUBLIC,
        duration: body.duration || 90,
        groupId: body.groupId || undefined,
        testDesc: body.testDesc || undefined,
        createdBy: body.createdBy || 'admin',
      });
      testId = saved.id;
    } else {
      const existing = await this.testModel.findById(testId);
      if (!existing) throw new BadRequestException('Test topilmadi');

      // Admin testni JSON orqali qayta yuklamoqchi bo'lsa (masalan, xato
      // topilgan savollarni tuzatish yoki AI tahlil qo'shish uchun) — eski
      // savollarni o'chirib tashlamasdan, orderIndex bo'yicha mos keladigan
      // savolni YANGILAYMIZ (o'sha _id saqlanib qoladi). Shunday qilib,
      // talabalar avval topshirgan natijalarning javob tahlili buzilmaydi —
      // ular hali ham o'sha savolga bog'lanib turadi. Yangi to'plamda ortiqcha
      // (eskisidan ko'proq) savol bo'lsa, ular yangi hujjat sifatida
      // qo'shiladi; eskisidan kamroq bo'lsa, ortiqcha eski savollar o'chadi.
      if (body.replace) {
        const existingQuestions = await this.questionModel.find({ testId });
        existingByOrder = new Map(existingQuestions.map((q) => [q.orderIndex, q]));
      }
    }

    const uploadsDir = join(process.cwd(), 'uploads');

    let savedCount = 0;
    const keptOrderIndexes = new Set<number>();

    for (let i = 0; i < body.questions.length; i++) {
      const q = body.questions[i];
      const isSpr = Array.isArray(q.options) && q.options.length === 0;
      if (!q.questionText || !Array.isArray(q.options) || (!isSpr && q.options.length !== 4)) continue;

      let imageUrl: string | undefined;

      // base64 rasm bo'lsa faylga saqlash
      if (q.questionImage && q.questionImage.startsWith('data:image')) {
        try {
          const matches = q.questionImage.match(/^data:image\/(\w+);base64,(.+)$/);
          if (matches) {
            const ext = matches[1];
            const data = matches[2];
            const filename = `${Date.now()}-${i}.${ext}`;
            fs.writeFileSync(join(uploadsDir, filename), Buffer.from(data, 'base64'));
            imageUrl = `/uploads/${filename}`;
          }
        } catch {}
      } else if (q.questionImage?.startsWith('/uploads/') || q.questionImage?.startsWith('http')) {
        imageUrl = q.questionImage;
      }

      const orderIndex = i + 1;
      const payload = {
        testId,
        questionText: q.questionText,
        questionImage: imageUrl,
        options: q.options,
        correctAnswer: Math.round(q.correctAnswer ?? 0),
        explanation: q.explanation || undefined,
        youtubeUrl: q.youtubeUrl || undefined,
        analysis: q.analysis || undefined,
        orderIndex,
      };

      const existingQuestion = existingByOrder?.get(orderIndex);
      if (existingQuestion) {
        await this.questionModel.updateOne({ _id: existingQuestion.id }, { $set: payload });
        keptOrderIndexes.add(orderIndex);
      } else {
        await this.questionModel.create(payload);
      }
      savedCount++;
    }

    // Yangi to'plamda ishlatilmagan (ortiqcha) eski savollarni o'chiramiz
    if (existingByOrder) {
      const staleIds = [...existingByOrder.entries()]
        .filter(([orderIndex]) => !keptOrderIndexes.has(orderIndex))
        .map(([, q]) => q.id);
      if (staleIds.length > 0) {
        await this.questionModel.deleteMany({ _id: { $in: staleIds } });
      }
    }

    const testUpdate: Record<string, any> = { totalQuestions: savedCount };
    if (body.testYoutubeUrl) testUpdate.testYoutubeUrl = body.testYoutubeUrl;
    if (body.testAnalysis) testUpdate.testAnalysis = body.testAnalysis;
    await this.testModel.updateOne({ _id: testId }, { $set: testUpdate });

    return {
      success: true,
      testId,
      totalQuestions: savedCount,
      message: `${savedCount} ta savol muvaffaqiyatli yuklandi`,
    };
  }

  private parseQuestions(text: string): {
    questionText: string;
    options: string[];
    correctAnswer: number;
  }[] {
    const questions: any[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    let currentQuestion: any = null;

    for (const line of lines) {
      // Savol: "1. Savol matni" yoki "1) Savol matni"
      const questionMatch = line.match(/^\d+[\.\)]\s+(.+)/);
      if (questionMatch) {
        if (currentQuestion && currentQuestion.options.length === 4) {
          questions.push(currentQuestion);
        }
        currentQuestion = {
          questionText: questionMatch[1],
          options: [],
          correctAnswer: 0,
        };
        continue;
      }

      // Variant: "A) ...*" — * to'g'ri javob belgisi
      const optionMatch = line.match(/^[A-Da-d][\.\)]\s+(.+)/);
      if (optionMatch && currentQuestion) {
        const optionText = optionMatch[1];
        const isCorrect = optionText.endsWith('*');
        const cleanText = isCorrect ? optionText.slice(0, -1).trim() : optionText.trim();

        if (isCorrect) {
          currentQuestion.correctAnswer = currentQuestion.options.length;
        }
        currentQuestion.options.push(cleanText);
      }
    }

    // Oxirgi savolni qo'shish
    if (currentQuestion && currentQuestion.options.length === 4) {
      questions.push(currentQuestion);
    }

    return questions;
  }
}