import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { PaymentProvider, PaymentStatus, PaymentType } from '../libs/enums/payment.enum';

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  groupId: string;

  @Column({ type: 'enum', enum: PaymentType })
  paymentType: PaymentType;

  @Column({ type: 'enum', enum: PaymentProvider })
  paymentProvider: PaymentProvider;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Column()
  amount: number;

  @Column({ nullable: true })
  clickTransactionId: string;

  @Column({ nullable: true })
  confirmedAt: Date;

  @Column({ nullable: true })
  confirmedBy: string;

  @CreateDateColumn()
  createdAt: Date;
}