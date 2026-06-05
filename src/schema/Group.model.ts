import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { GroupType, GroupStatus } from '../libs/enums/group.enum';

@Entity('groups')
export class GroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: GroupType })
  groupType: GroupType;

  @Column({ type: 'enum', enum: GroupStatus, default: GroupStatus.ACTIVE })
  groupStatus: GroupStatus;

  @Column()
  groupName: string;

  @Column({ unique: true })
  telegramChatId: string;

  @Column()
  durationMonths: number;

  @Column({ nullable: true })
  groupDesc: string;

  @Column({ default: 0 })
  memberCount: number;

  @Column({ nullable: true })
  endedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}