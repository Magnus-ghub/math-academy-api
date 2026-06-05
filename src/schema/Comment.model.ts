import { CommentStatus, CommentType } from 'src/libs/enums/comment.enum';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';


@Entity('comments')
export class CommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: CommentType })
  commentType: CommentType;

  @Column({ type: 'enum', enum: CommentStatus, default: CommentStatus.PENDING })
  commentStatus: CommentStatus;

  @Column('text')
  text: string;

  @Column({ nullable: true })
  rating: number;

  @Column()
  userId: string;

  @Column({ nullable: true })
  testId: string;

  @CreateDateColumn()
  createdAt: Date;
}