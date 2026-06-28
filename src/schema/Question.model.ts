import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { QuestionType } from '../libs/enums/question.enum';

@Entity('questions')
export class QuestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  testId: string;

  @Column({ type: 'enum', enum: QuestionType, default: QuestionType.SINGLE })
  questionType: QuestionType;

  @Column('text')
  questionText: string;

  @Column({ nullable: true })
  questionImage: string;

  @Column({ nullable: true })
  section: string;

  @Column({ type: 'json' })
  options: string[];

  @Column()
  correctAnswer: number;

  @Column({ nullable: true, type: 'text' })
  explanation: string;

  @Column({ nullable: true })
  youtubeUrl: string;

  @Column({ nullable: true, type: 'text' })
  analysis: string;

  @Column()
  orderIndex: number;

  @CreateDateColumn()
  createdAt: Date;
}