import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { PubSub } from 'graphql-subscriptions';
import { PaymentEntity, PaymentDocument } from '../../schema/Payment.model';
import { UserEntity, UserDocument } from '../../schema/User.model';
import {
  UserGroupEntity,
  UserGroupDocument,
} from '../../schema/User_Group.model';
import { GroupEntity, GroupDocument } from '../../schema/Group.model';
import { TestEntity, TestDocument } from '../../schema/Test.model';
import {
  PaymentProvider,
  PaymentStatus,
  PaymentType,
} from '../../libs/enums/payment.enum';
import {
  PaymentStats,
  DailyRevenuePoint,
  TopTest,
} from '../../libs/dto/payment/paymentStats';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';

export const PAYMENT_REPORTED = 'PAYMENT_REPORTED';

export interface ClickResponse {
  click_trans_id: string | number;
  merchant_trans_id: string;
  merchant_prepare_id: string;
  merchant_confirm_id: string;
  error: number;
  error_note: string;
}

const CLICK_REQUIRED_FIELDS = [
  'click_trans_id',
  'service_id',
  'merchant_trans_id',
  'amount',
  'action',
  'error',
  'error_note',
  'sign_time',
  'sign_string',
  'click_paydoc_id',
];

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

    @InjectModel(TestEntity.name)
    private testModel: Model<TestDocument>,

    private config: ConfigService,
    private telegramBotService: TelegramBotService,
    @Inject('PUB_SUB') private pubSub: PubSub,
  ) {}

  // Frontend'dagi tekshiruvni backendda ham qaytaramiz — mijoz GraphQL'ga
  // to'g'ridan-to'g'ri murojaat qilib, frontend validatsiyasini chetlab
  // o'tishi mumkin
  private assertValidTopupAmount(amount: number): void {
    if (amount < 1000 || amount % 1000 !== 0) {
      throw new BadRequestException("Summa 1000 so'mga karrali bo'lishi kerak");
    }
  }

  // Balansni Click orqali to'ldirish — PENDING TOPUP payment yaratadi va to'lov linkini qaytaradi
  async initiateClickTopup(
    userId: string,
    amount: number,
  ): Promise<{ payment: PaymentDocument; payUrl: string }> {
    this.assertValidTopupAmount(amount);
    const payment = await this.paymentModel.create({
      userId,
      amount,
      paymentType: PaymentType.TOPUP,
      paymentProvider: PaymentProvider.CLICK,
      paymentStatus: PaymentStatus.PENDING,
    });

    const serviceId = this.config.get<string>('CLICK_SERVICE_ID');
    const merchantId = this.config.get<string>('CLICK_MERCHANT_ID');
    const returnUrl = `${this.config.get<string>('FRONTEND_URL')}/dashboard/balance`;
    const payUrl =
      `https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${merchantId}` +
      `&amount=${payment.amount}&transaction_param=${String(payment._id)}` +
      `&return_url=${encodeURIComponent(returnUrl)}`;

    return { payment, payUrl };
  }

  // Balansni qo'lda (admin orqali) to'ldirishni so'rash — chek/izoh bilan
  async reportManualTopup(
    userId: string,
    amount: number,
    receiptUrl?: string,
    studentNote?: string,
  ): Promise<PaymentDocument> {
    this.assertValidTopupAmount(amount);
    if (!receiptUrl && !studentNote) {
      throw new BadRequestException('Chek rasmini yuklang yoki izoh yozing');
    }

    // Talaba admin panelini keraksiz so'rovlar bilan to'ldirmasligi uchun —
    // birdaniga faqat bitta ko'rib chiqilmagan qo'lda so'rov bo'lishi mumkin.
    // Xato yuborilgan bo'lsa, talaba avval uni bekor qilishi kerak (item 3'dagi
    // cancelMyPendingPayment orqali) — keyin qaytadan yuborishi mumkin.
    const hasPendingManualTopup = await this.paymentModel.exists({
      userId,
      paymentType: PaymentType.TOPUP,
      paymentProvider: PaymentProvider.MANUAL,
      paymentStatus: PaymentStatus.PENDING,
    });
    if (hasPendingManualTopup) {
      throw new BadRequestException(
        "Sizda allaqachon ko'rib chiqilmagan so'rov bor — admin javobini kuting yoki uni bekor qiling",
      );
    }

    const payment = await this.paymentModel.create({
      userId,
      amount,
      receiptUrl,
      studentNote,
      paymentType: PaymentType.TOPUP,
      paymentProvider: PaymentProvider.MANUAL,
      paymentStatus: PaymentStatus.PENDING,
    });
    await this.pubSub.publish(PAYMENT_REPORTED, { paymentReported: payment });
    return payment;
  }

  async getMyBalance(userId: string): Promise<number> {
    const user = await this.userModel.findById(userId);
    return user?.balance ?? 0;
  }

  // Testni balansdan sotib olish — bir zumda, Click/admin kutmasdan amalga oshadi
  async purchaseTestWithBalance(
    userId: string,
    testId: string,
  ): Promise<PaymentDocument> {
    const test = await this.testModel.findById(testId);
    if (!test) throw new NotFoundException('Test topilmadi');
    if (!test.testPrice)
      throw new BadRequestException('Bu test uchun narx belgilanmagan');

    const alreadyPurchased = await this.paymentModel.exists({
      userId,
      testId: String(test._id),
      paymentType: PaymentType.PREMIUM,
      paymentStatus: PaymentStatus.CONFIRMED,
    });
    if (alreadyPurchased) {
      throw new BadRequestException('Bu test allaqachon sotib olingan');
    }

    const debited = await this.userModel.findOneAndUpdate(
      { _id: userId, balance: { $gte: test.testPrice } },
      { $inc: { balance: -test.testPrice } },
    );
    if (!debited) throw new BadRequestException('Balansingiz yetarli emas');

    return this.paymentModel.create({
      userId,
      testId: String(test._id),
      testTitle: test.testTitle,
      paymentType: PaymentType.PREMIUM,
      paymentProvider: PaymentProvider.BALANCE,
      paymentStatus: PaymentStatus.CONFIRMED,
      amount: test.testPrice,
      confirmedAt: new Date(),
    });
  }

  // Click Prepare so'rovi (action=0) — to'lovni tasdiqlashdan oldingi tekshiruv
  async handleClickPrepare(body: Record<string, any>): Promise<ClickResponse> {
    if (this.isClickRequestIncomplete(body)) {
      return this.clickError(body, -8, 'Error in request from click');
    }

    if (!this.isClickSignatureValid(body)) {
      return this.clickError(body, -1, 'SIGN CHECK FAILED!');
    }

    if (Number(body.action) !== 0) {
      return this.clickError(body, -3, 'Action not found');
    }

    const payment = await this.findPaymentById(body.merchant_trans_id);
    if (!payment) {
      return this.clickError(body, -5, 'User does not exist');
    }

    if (payment.paymentStatus === PaymentStatus.CONFIRMED) {
      return this.clickError(body, -4, 'Already paid');
    }

    if (Math.abs(payment.amount - Number(body.amount)) > 0.01) {
      return this.clickError(body, -2, 'Incorrect parameter amount');
    }

    if (payment.paymentStatus === PaymentStatus.FAILED) {
      return this.clickError(body, -9, 'Transaction cancelled');
    }

    return this.clickSuccess(body, payment);
  }

  // Click Complete so'rovi (action=1) — to'lov yakunlangach kelgan tasdiq
  async handleClickComplete(body: Record<string, any>): Promise<ClickResponse> {
    if (
      this.isClickRequestIncomplete(body) ||
      body.merchant_prepare_id === undefined
    ) {
      return this.clickError(body, -8, 'Error in request from click');
    }

    if (!this.isClickSignatureValid(body)) {
      return this.clickError(body, -1, 'SIGN CHECK FAILED!');
    }

    if (Number(body.action) !== 1) {
      return this.clickError(body, -3, 'Action not found');
    }

    const payment = await this.findPaymentById(body.merchant_prepare_id);
    if (!payment) {
      return this.clickError(body, -6, 'Transaction does not exist');
    }

    // Click o'z tomonida to'lov bekor bo'lganini shu error maydoni orqali bildiradi
    if (Number(body.error) < 0) {
      await this.paymentModel.updateOne(
        { _id: payment._id },
        { $set: { paymentStatus: PaymentStatus.FAILED } },
      );
      return this.clickError(body, -9, 'Transaction cancelled');
    }

    if (payment.paymentStatus === PaymentStatus.CONFIRMED) {
      return this.clickError(body, -4, 'Already paid');
    }

    if (Math.abs(payment.amount - Number(body.amount)) > 0.01) {
      return this.clickError(body, -2, 'Incorrect parameter amount');
    }

    await this.paymentModel.updateOne(
      { _id: payment._id },
      {
        $set: {
          paymentStatus: PaymentStatus.CONFIRMED,
          confirmedAt: new Date(),
          clickTransactionId: String(body.click_trans_id),
        },
      },
    );
    await this.activateAccess(payment);

    return this.clickSuccess(body, payment);
  }

  private isClickRequestIncomplete(body: Record<string, any>): boolean {
    return CLICK_REQUIRED_FIELDS.some(
      (field) => body[field] === undefined || body[field] === null,
    );
  }

  private isClickSignatureValid(body: Record<string, any>): boolean {
    const secretKey = this.config.get<string>('CLICK_SECRET_KEY');
    const isComplete = Number(body.action) === 1;
    const parts = [
      body.click_trans_id,
      body.service_id,
      secretKey,
      body.merchant_trans_id,
      isComplete ? body.merchant_prepare_id : '',
      body.amount,
      body.action,
      body.sign_time,
    ];
    const expected = crypto
      .createHash('md5')
      .update(parts.join(''))
      .digest('hex');
    return expected === body.sign_string;
  }

  private async findPaymentById(id: string): Promise<PaymentDocument | null> {
    return this.paymentModel.findById(id).catch(() => null);
  }

  private clickError(
    body: Record<string, any>,
    error: number,
    error_note: string,
  ): ClickResponse {
    return {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      merchant_prepare_id: body.merchant_prepare_id
        ? String(body.merchant_prepare_id)
        : '',
      merchant_confirm_id: body.merchant_prepare_id
        ? String(body.merchant_prepare_id)
        : '',
      error,
      error_note,
    };
  }

  private clickSuccess(
    body: Record<string, any>,
    payment: PaymentDocument,
  ): ClickResponse {
    return {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      merchant_prepare_id: String(payment._id),
      merchant_confirm_id: String(payment._id),
      error: 0,
      error_note: 'Success',
    };
  }

  // Manual confirm — admin tomonidan. confirmedAmount — admin haqiqatda qabul
  // qilgan summa (0 bo'lishi ham mumkin, masalan tanish talabaga tekinga ochib
  // bersa) — daromadni aniq hisoblash uchun amount shu qiymatga yangilanadi.
  async confirmManualPayment(
    paymentId: string,
    adminId: string,
    confirmedAmount: number,
    adminReply?: string,
  ): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) throw new NotFoundException('Payment not found');

    await this.paymentModel.updateOne(
      { _id: paymentId },
      {
        $set: {
          paymentStatus: PaymentStatus.CONFIRMED,
          amount: confirmedAmount,
          confirmedAt: new Date(),
          confirmedBy: adminId,
          adminReply: adminReply ?? null,
        },
      },
    );

    const confirmed = (await this.paymentModel.findById(
      paymentId,
    )) as PaymentDocument;
    await this.activateAccess(confirmed);
    await this.notifyPaymentOutcome(confirmed, true);
    return confirmed;
  }

  // Manual reject — admin tomonidan, sababi bilan
  async rejectManualPayment(
    paymentId: string,
    adminReply?: string,
  ): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findByIdAndUpdate(
      paymentId,
      {
        $set: {
          paymentStatus: PaymentStatus.FAILED,
          adminReply: adminReply ?? null,
        },
      },
      { new: true },
    );
    if (!payment) throw new NotFoundException('Payment not found');

    await this.notifyPaymentOutcome(payment, false);
    return payment;
  }

  // To'lov tasdiqlangan/rad etilgach talabaga Telegram orqali xabar yuboradi
  private async notifyPaymentOutcome(
    payment: PaymentDocument,
    confirmed: boolean,
  ): Promise<void> {
    const user = await this.userModel.findById(payment.userId);
    if (!user?.telegramId) return;

    const isTopup = payment.paymentType === PaymentType.TOPUP;
    const header = confirmed
      ? isTopup
        ? "✅ <b>Balansingiz to'ldirildi!</b>"
        : "✅ <b>To'lovingiz tasdiqlandi!</b>"
      : isTopup
        ? "❌ <b>Balansni to'ldirish rad etildi</b>"
        : "❌ <b>To'lovingiz rad etildi</b>";

    const lines = [header, ''];
    if (!isTopup && payment.testTitle)
      lines.push(`📝 Test: ${payment.testTitle}`);
    if (confirmed)
      lines.push(
        `💵 ${isTopup ? "Balansga qo'shildi" : 'Qabul qilingan summa'}: ${payment.amount.toLocaleString('uz-UZ')} so'm`,
      );
    if (payment.adminReply)
      lines.push('', `💬 Admin javobi:\n${payment.adminReply}`);
    if (confirmed && !isTopup)
      lines.push(
        '',
        "🎉 Test endi sizga ochiq — 'Testlar' bo'limidan boshlashingiz mumkin.",
      );
    if (confirmed && isTopup)
      lines.push(
        '',
        '🛍️ Endi shu balansdan testlarni sotib olishingiz mumkin.',
      );

    await this.telegramBotService.notifyUser(user.telegramId, lines.join('\n'));
  }

  // To'lov tasdiqlangandan keyin access berish
  // PREMIUM uchun alohida amal shart emas — CONFIRMED Payment yozuvining
  // o'zi shu testId uchun kirish huquqi hisoblanadi (getTestWithAccess shuni tekshiradi)
  private async activateAccess(payment: PaymentDocument): Promise<void> {
    if (payment.paymentType === PaymentType.TOPUP) {
      await this.userModel.updateOne(
        { _id: payment.userId },
        { $inc: { balance: payment.amount } },
      );

      // Faqat CLICK orqali to'ldirishda komissiya olinadi — daromad
      // hisobotida sof tushumni ko'rsatish uchun saqlab qo'yamiz
      if (payment.paymentProvider === PaymentProvider.CLICK) {
        const rate = Number(
          this.config.get<string>('CLICK_COMMISSION_RATE') ?? '0.02',
        );
        await this.paymentModel.updateOne(
          { _id: payment._id },
          { $set: { platformFee: Math.round(payment.amount * rate) } },
        );
      }
      return;
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
        await this.userGroupModel.updateOne(
          { _id: existing._id },
          { $set: { expiresAt } },
        );
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

  // Admin balansni qo'lda tuzatadi — xato tasdiqlash yoki alohida vaziyatlarni
  // to'g'irlash uchun (masalan ortiqcha o'tkazilgan pulni balansdan ayirish).
  // amount musbat (qo'shish) yoki manfiy (ayirish) bo'lishi mumkin, lekin
  // natijaviy balans manfiy bo'lishiga yo'l qo'yilmaydi. Har bir tuzatish
  // Payment yozuvi sifatida saqlanadi — audit va statistikada kuzatib borish uchun.
  async adjustUserBalance(
    adminId: string,
    userId: string,
    amount: number,
    reason?: string,
  ): Promise<PaymentDocument> {
    if (!amount) throw new BadRequestException("Summa 0 bo'lishi mumkin emas");

    const updated = await this.userModel.findOneAndUpdate(
      { _id: userId, balance: { $gte: -amount } },
      { $inc: { balance: amount } },
      { new: true },
    );
    if (!updated) {
      throw new BadRequestException(
        "Balans manfiy bo'lib qolishi mumkin emas — foydalanuvchi balansi yetarli emas",
      );
    }

    const payment = await this.paymentModel.create({
      userId,
      amount,
      paymentType: PaymentType.ADJUSTMENT,
      paymentProvider: PaymentProvider.MANUAL,
      paymentStatus: PaymentStatus.CONFIRMED,
      adminReply: reason ?? null,
      confirmedAt: new Date(),
      confirmedBy: adminId,
    });

    await this.notifyBalanceAdjustment(updated, amount, reason);
    return payment;
  }

  private async notifyBalanceAdjustment(
    user: UserDocument,
    amount: number,
    reason?: string,
  ): Promise<void> {
    if (!user.telegramId) return;

    const sign = amount > 0 ? '+' : '';
    const lines = [
      '🔧 <b>Balansingiz admin tomonidan tuzatildi</b>',
      '',
      `💵 O'zgarish: ${sign}${amount.toLocaleString('uz-UZ')} so'm`,
      `💰 Joriy balans: ${user.balance.toLocaleString('uz-UZ')} so'm`,
    ];
    if (reason) lines.push('', `💬 Sabab:\n${reason}`);

    await this.telegramBotService.notifyUser(user.telegramId, lines.join('\n'));
  }

  // Talaba o'zining PENDING so'rovini bekor qiladi (masalan xato summa/chek
  // yuborgan bo'lsa) — atomik shart bilan, chunki Click webhook aynan shu
  // paytda kelib to'lovni CONFIRMED qilib ulgurgan bo'lishi mumkin
  async cancelMyPendingPayment(
    userId: string,
    paymentId: string,
  ): Promise<PaymentDocument> {
    const cancelled = await this.paymentModel.findOneAndUpdate(
      { _id: paymentId, userId, paymentStatus: PaymentStatus.PENDING },
      { $set: { paymentStatus: PaymentStatus.CANCELLED } },
      { new: true },
    );
    if (!cancelled) {
      throw new NotFoundException(
        "So'rov topilmadi yoki allaqachon ko'rib chiqilgan",
      );
    }
    return cancelled;
  }

  async getMyPayments(userId: string): Promise<PaymentDocument[]> {
    return this.paymentModel.find({ userId }).sort({ createdAt: -1 });
  }

  // Foydalanuvchi CONFIRMED to'lov qilgan (sotib olgan) testlar ro'yxati —
  // frontend test kartochkasida "Boshlash" tugmasini ko'rsatish uchun
  async getMyPurchasedTestIds(userId: string): Promise<string[]> {
    const ids = await this.paymentModel.distinct('testId', {
      userId,
      paymentType: PaymentType.PREMIUM,
      paymentStatus: PaymentStatus.CONFIRMED,
      testId: { $ne: null },
    });
    return ids;
  }

  async getAllPayments(): Promise<any[]> {
    const payments = await this.paymentModel.find().sort({ createdAt: -1 });
    return this.enrichWithUserNames(payments);
  }

  async getPendingPayments(): Promise<any[]> {
    const payments = await this.paymentModel
      .find({ paymentStatus: PaymentStatus.PENDING })
      .sort({ createdAt: -1 });
    return this.enrichWithUserNames(payments);
  }

  // Admin talabani ismi-familiyasi orqali tanishi mumkin (masalan tanish/
  // yordamchisiga tekinga ochib berishdan oldin) — shuning uchun ro'yxatda
  // xom userId o'rniga ism ham ko'rsatiladi.
  private async enrichWithUserNames(
    payments: PaymentDocument[],
  ): Promise<any[]> {
    const userIds = [...new Set(payments.map((p) => p.userId))];
    const users = userIds.length
      ? await this.userModel.find({ _id: { $in: userIds } })
      : [];
    const userMap = new Map(
      users.map((u) => [u.id, u] as [string, UserDocument]),
    );

    return payments.map((p) => {
      const user = userMap.get(p.userId);
      return {
        ...p.toObject(),
        userName: user?.userName ?? null,
        userLastName: user?.userLastName ?? null,
      };
    });
  }

  async getPaymentStats(): Promise<PaymentStats> {
    const DAYS = 14;
    const since = new Date();
    since.setDate(since.getDate() - (DAYS - 1));
    since.setHours(0, 0, 0, 0);

    const [
      netRevenueAgg,
      topupAgg,
      commissionAgg,
      outstandingAgg,
      uniquePayingUserIds,
      pendingCount,
      avgConfirmAgg,
      providerBreakdown,
      dailyRevenueAgg,
      topTests,
    ] = await Promise.all([
      this.paymentModel.aggregate([
        {
          $match: {
            paymentStatus: PaymentStatus.CONFIRMED,
            paymentType: { $nin: [PaymentType.TOPUP, PaymentType.ADJUSTMENT] },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.paymentModel.aggregate([
        {
          $match: {
            paymentStatus: PaymentStatus.CONFIRMED,
            paymentType: PaymentType.TOPUP,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.paymentModel.aggregate([
        { $match: { platformFee: { $ne: null } } },
        { $group: { _id: null, total: { $sum: '$platformFee' } } },
      ]),
      this.userModel.aggregate([
        { $group: { _id: null, total: { $sum: '$balance' } } },
      ]),
      this.paymentModel.distinct('userId', {
        paymentStatus: PaymentStatus.CONFIRMED,
        paymentType: { $ne: PaymentType.ADJUSTMENT },
      }),
      this.paymentModel.countDocuments({
        paymentStatus: PaymentStatus.PENDING,
      }),
      this.paymentModel.aggregate([
        {
          $match: {
            paymentStatus: PaymentStatus.CONFIRMED,
            confirmedAt: { $ne: null },
          },
        },
        {
          $project: {
            hours: {
              $divide: [{ $subtract: ['$confirmedAt', '$createdAt'] }, 3600000],
            },
          },
        },
        { $group: { _id: null, avg: { $avg: '$hours' } } },
      ]),
      this.paymentModel.aggregate([
        {
          $match: {
            paymentStatus: PaymentStatus.CONFIRMED,
            paymentType: PaymentType.TOPUP,
          },
        },
        {
          $group: {
            _id: '$paymentProvider',
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),
      this.paymentModel.aggregate([
        {
          $match: {
            paymentStatus: PaymentStatus.CONFIRMED,
            paymentType: { $nin: [PaymentType.TOPUP, PaymentType.ADJUSTMENT] },
            confirmedAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$confirmedAt' },
            },
            amount: { $sum: '$amount' },
          },
        },
      ]),
      this.paymentModel.aggregate([
        {
          $match: {
            paymentStatus: PaymentStatus.CONFIRMED,
            paymentType: PaymentType.PREMIUM,
            testId: { $ne: null },
          },
        },
        {
          $group: {
            _id: '$testId',
            testTitle: { $first: '$testTitle' },
            count: { $sum: 1 },
            revenue: { $sum: '$amount' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Aggregatsiya natijasida bo'sh kunlar tushib qoladi — grafikda uzilish
    // bo'lmasligi uchun oxirgi 14 kunni to'liq to'ldiramiz (bo'sh kun = 0)
    const dailyMap = new Map<string, number>(
      dailyRevenueAgg.map((d: any) => [d._id, d.amount]),
    );
    const dailyRevenue: DailyRevenuePoint[] = [];
    for (let i = 0; i < DAYS; i++) {
      const day = new Date(since);
      day.setDate(day.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      dailyRevenue.push({ date: key, amount: dailyMap.get(key) ?? 0 });
    }

    return {
      netRevenue: netRevenueAgg[0]?.total ?? 0,
      totalTopupConfirmed: topupAgg[0]?.total ?? 0,
      totalClickCommission: commissionAgg[0]?.total ?? 0,
      outstandingBalance: outstandingAgg[0]?.total ?? 0,
      uniquePayingUsers: uniquePayingUserIds.length,
      pendingCount,
      avgConfirmHours: avgConfirmAgg[0]?.avg ?? undefined,
      providerBreakdown: providerBreakdown.map((p: any) => ({
        provider: p._id,
        count: p.count,
        amount: p.amount,
      })),
      dailyRevenue,
      topTests: topTests.map((t: any) => ({
        testId: t._id,
        testTitle: t.testTitle ?? "Noma'lum test",
        count: t.count,
        revenue: t.revenue,
      })),
    };
  }

  // Har bir pullik testning necha marta sotib olinganini qaytaradi (cheklovsiz) —
  // admin/tests sahifasida har bir test kartochkasida ko'rsatish uchun
  async getTestSalesStats(): Promise<TopTest[]> {
    const sales = await this.paymentModel.aggregate([
      {
        $match: {
          paymentStatus: PaymentStatus.CONFIRMED,
          paymentType: PaymentType.PREMIUM,
          testId: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$testId',
          testTitle: { $first: '$testTitle' },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' },
        },
      },
    ]);

    return sales.map((t: any) => ({
      testId: t._id,
      testTitle: t.testTitle ?? "Noma'lum test",
      count: t.count,
      revenue: t.revenue,
    }));
  }
}
