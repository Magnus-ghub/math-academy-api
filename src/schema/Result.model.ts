import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ResultStatus } from '../libs/enums/result.enum';

@Entity('results')
export class ResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  testId: string;

  @Column({ nullable: true })
  groupId: string;

  @Column({ type: 'enum', enum: ResultStatus, default: ResultStatus.IN_PROGRESS })
  resultStatus: ResultStatus;

  @Column({ default: 0 })
  totalQuestions: number;

  @Column({ default: 0 })
  correctAnswers: number;

  @Column({ type: 'float', default: 0 })
  score: number;

  @Column({ default: 0 })
  duration: number;

  @Column({ type: 'jsonb', nullable: true })
  answers: {
    questionId: string;
    selectedAnswer: number;
    isCorrect: boolean;
    timeSpent: number;
  }[];

  @Column({ nullable: true })
  finishedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}