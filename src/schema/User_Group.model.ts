import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { GroupType } from '../libs/enums/group.enum';

@Entity('user_groups')
export class UserGroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  groupId: string;

  @Column({ type: 'enum', enum: GroupType })
  groupType: GroupType;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  joinedAt: Date;
}