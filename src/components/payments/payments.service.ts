import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentEntity, PaymentDocument } from '../../schema/Payment.model';
import { UserEntity, UserDocument } from '../../schema/User.model';
import { UserGroupEntity, UserGroupDocument } from '../../schema/User_Group.model';
import { GroupEntity, GroupDocument } from '../../schema/Group.model';
import { PaymentInput } from '../../libs/dto/payment/paymentInput';
import { PaymentProvider, PaymentStatus, PaymentType } from '../../libs/enums/payment.enum';
import { UserRole } from '../../libs/enums/user.enum';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(PaymentEntity.name)
    private paymentModel: Model<PaymentDocument>,

    @InjectModel(UserEntity.name)
    private userModel: Model<UserDocument>,

    @InjectModel(UserGroupEntity.name)
    private userGroupModel: Model<UserGroupDocument>,

    @InjectModel(GroupEntity.name)
    private groupModel: Model<GroupDocument>,
  ) {}

  // Yangi to'lov yaratish
  async createPayment(userId: string, input: PaymentInput): Promise<PaymentDocument> {
    return this.paymentModel.create({
      ...input,
      userId,
      paymentStatus: PaymentStatus.PENDING,
    });
  }

  // Click webhook — to'lov tasdiqlanganda
  async confirmClickPayment(clickTransactionId: string, amount: number): Promise<void> {
    const payment = await this.paymentModel.findOne({
      clickTransactionId,
      paymentStatus: PaymentStatus.PENDING,
    });
    if (!payment) return;

    await this.paymentModel.updateOne(
      { _id: payment._id },
      { $set: { paymentStatus: PaymentStatus.CONFIRMED, confirmedAt: new Date() } },
    );

    await this.activateAccess(payment);
  }

  // Manual confirm — admin tomonidan
  async confirmManualPayment(paymentId: string, adminId: string): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) throw new NotFoundException('Payment not found');

    await this.paymentModel.updateOne(
      { _id: paymentId },
      { $set: { paymentStatus: PaymentStatus.CONFIRMED, confirmedAt: new Date(), confirmedBy: adminId } },
    );

    await this.activateAccess(payment);
    return this.paymentModel.findById(paymentId) as Promise<PaymentDocument>;
  }

  // To'lov tasdiqlangandan keyin access berish
  private async activateAccess(payment: PaymentDocument): Promise<void> {
    if (payment.paymentType === PaymentType.PREMIUM) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      await this.userModel.updateOne(
        { _id: payment.userId },
        { $set: { userRole: UserRole.ACADEM_STUDENT, premiumExpiresAt: expiresAt } },
      );
    }

    if (payment.paymentType === PaymentType.GROUP && payment.groupId) {
      const group = await this.groupModel.findById(payment.groupId);
      if (!group) return;

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + group.durationMonths);

      const existing = await this.userGroupModel.findOne({
        userId: payment.userId,
        groupId: payment.groupId,
      });

      if (existing) {
        await this.userGroupModel.updateOne({ _id: existing._id }, { $set: { expiresAt } });
      } else {
        await this.userGroupModel.create({
          userId: payment.userId,
          groupId: payment.groupId,
          groupType: group.groupType,
          expiresAt,
        });
      }
    }
  }

  async getMyPayments(userId: string): Promise<PaymentDocument[]> {
    return this.paymentModel.find({ userId }).sort({ createdAt: -1 });
  }

  async getAllPayments(): Promise<PaymentDocument[]> {
    return this.paymentModel.find().sort({ createdAt: -1 });
  }

  async getPendingPayments(): Promise<PaymentDocument[]> {
    return this.paymentModel.find({ paymentStatus: PaymentStatus.PENDING }).sort({ createdAt: -1 });
  }
}
