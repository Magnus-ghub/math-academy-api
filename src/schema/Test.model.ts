import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TestType, TestAccess, TestStatus, TestBlock, DTMType, TestDifficulty } from '../libs/enums/test.enum';

@Entity('tests')
export class TestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TestType })
  testType: TestType;

  @Column({ type: 'enum', enum: TestAccess, default: TestAccess.PUBLIC })
  testAccess: TestAccess;

  @Column({ type: 'enum', enum: TestStatus, default: TestStatus.DRAFT })
  testStatus: TestStatus;

  @Column({ type: 'enum', enum: TestBlock, nullable: true })
  testBlock: TestBlock;

  @Column({ type: 'enum', enum: DTMType, nullable: true })
  dtmType: DTMType;

  @Column({ type: 'enum', enum: TestDifficulty, default: TestDifficulty.STANDART })
  testDifficulty: TestDifficulty;

  @Column()
  testTitle: string;

  @Column({ nullable: true })
  testDesc: string;

  @Column({ nullable: true })
  testImage: string;

  @Column()
  duration: number;

  @Column({ default: 0 })
  totalQuestions: number;

  @Column({ default: 0 })
  totalAttempts: number;

  @Column({ nullable: true })
  groupId: string;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}