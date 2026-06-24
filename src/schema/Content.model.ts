import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ContentType, ContentStatus } from '../libs/enums/content.enum';

@Entity('contents')
export class ContentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ContentType })
  contentType: ContentType;

  @Column({ type: 'enum', enum: ContentStatus, default: ContentStatus.DRAFT })
  contentStatus: ContentStatus;

  @Column()
  contentTitle: string;

  @Column({ nullable: true, type: 'text' })
  contentDesc: string;

  @Column({ nullable: true })
  contentImage: string;

  @Column({ nullable: true })
  contentVideo: string;

  @Column({ default: 0 })
  viewCount: number;

  @Column()
  createdBy: string;

  @Column({ type: 'text', nullable: true })
  metaJson: string;

  @Column({ nullable: true })
  publishedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}