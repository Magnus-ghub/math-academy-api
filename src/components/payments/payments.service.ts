import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEntity } from '../../schema/Payment.model';
import { UserEntity } from '../../schema/User.model';
import { UserGroupEntity } from '../../schema/User_Group.model';
import { GroupEntity } from '../../schema/Group.model';
import { PaymentInput } from '../../libs/dto/payment/paymentInput';
import { PaymentProvider, PaymentStatus, PaymentType } from '../../libs/enums/payment.enum';
import { UserRole } from '../../libs/enums/user.enum';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private paymentRepo: Repository<PaymentEntity>,

    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,

    @InjectRepository(UserGroupEntity)
    private userGroupRepo: Repository<UserGroupEntity>,

    @InjectRepository(GroupEntity)
    private groupRepo: Repository<GroupEntity>,
  ) {}

  // Yangi to'lov yaratish
  async createPayment(userId: string, input: PaymentInput): Promise<PaymentEntity> {
    const payment = this.paymentRepo.create({
      ...input,
      userId,
      paymentStatus: PaymentStatus.PENDING,
    });
    return this.paymentRepo.save(payment);
  }

  // Click webhook — to'lov tasdiqlanganda
  async confirmClickPayment(clickTransactionId: string, amount: number): Promise<void> {
    const payment = await this.paymentRepo.findOne({
      where: { clickTransactionId, paymentStatus: PaymentStatus.PENDING },
    });
    if (!payment) return;

    await this.paymentRepo.update(payment.id, {
      paymentStatus: PaymentStatus.CONFIRMED,
      confirmedAt: new Date(),
    });

    await this.activateAccess(payment);
  }

  // Manual confirm — admin tomonidan
  async confirmManualPayment(paymentId: string, adminId: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    await this.paymentRepo.update(paymentId, {
      paymentStatus: PaymentStatus.CONFIRMED,
      confirmedAt: new Date(),
      confirmedBy: adminId,
    });

    await this.activateAccess(payment);
    return this.paymentRepo.findOne({ where: { id: paymentId } }) as Promise<PaymentEntity>;
  }

  // To'lov tasdiqlangandan keyin access berish
  private async activateAccess(payment: PaymentEntity): Promise<void> {
    if (payment.paymentType === PaymentType.PREMIUM) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      await this.userRepo.update(payment.userId, {
        userRole: UserRole.ACADEM_STUDENT,
        premiumExpiresAt: expiresAt,
      });
    }

    if (payment.paymentType === PaymentType.GROUP && payment.groupId) {
      const group = await this.groupRepo.findOne({ where: { id: payment.groupId } });
      if (!group) return;

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + group.durationMonths);

      const existing = await this.userGroupRepo.findOne({
        where: { userId: payment.userId, groupId: payment.groupId },
      });

      if (existing) {
        await this.userGroupRepo.update(existing.id, { expiresAt });
      } else {
        const userGroup = this.userGroupRepo.create({
          userId: payment.userId,
          groupId: payment.groupId,
          groupType: group.groupType,
          expiresAt,
        });
        await this.userGroupRepo.save(userGroup);
      }
    }
  }

  async getMyPayments(userId: string): Promise<PaymentEntity[]> {
    return this.paymentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllPayments(): Promise<PaymentEntity[]> {
    return this.paymentRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getPendingPayments(): Promise<PaymentEntity[]> {
    return this.paymentRepo.find({
      where: { paymentStatus: PaymentStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }
}