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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionEntity } from '../../schema/Question.model';
import { TestEntity } from '../../schema/Test.model';

@Controller('upload')
export class UploadController {
  constructor(
    @InjectRepository(QuestionEntity)
    private questionRepo: Repository<QuestionEntity>,
    @InjectRepository(TestEntity)
    private testRepo: Repository<TestEntity>,
  ) {}

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

    const test = await this.testRepo.findOne({ where: { id: testId } });
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
      const question = this.questionRepo.create({
        testId,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        orderIndex: i + 1,
      });
      await this.questionRepo.save(question);
      savedCount++;
    }

    // totalQuestions yangilash
    await this.testRepo.update(testId, { totalQuestions: savedCount });

    return {
      success: true,
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