import { UserAuthType, UserRole, UserStatus } from 'src/libs/enums/user.enum';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  userRole: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  userStatus: UserStatus;

  @Column({ type: 'enum', enum: UserAuthType })
  userAuthType: UserAuthType;

  @Column({ unique: true, nullable: true })
  telegramId: string;

  @Column({ unique: true, nullable: true })
  googleId: string;

  @Column({ nullable: true })
  userName: string;

  @Column({ nullable: true })
  userLastName: string;

  @Column({ nullable: true })
  userPhone: string;

  @Column({ nullable: true })
  userImage: string;

  @Column({ nullable: true })
  userAddress: string;

  @Column({ nullable: true })
  userDesc: string;

  @Column({ unique: true, nullable: true })
  userEmail: string;

  @Column({ nullable: true })
  userPassword: string;

  @Column({ type: 'varchar', nullable: true })
  resetPasswordToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  premiumExpiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
