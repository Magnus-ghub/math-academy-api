import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { join } from 'path';
import { unlink } from 'fs/promises';
import request from 'supertest';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { DatabaseModule } from '../src/database/database.module';
import { PaymentsModule } from '../src/components/payments/payments.module';
import { TelegramBotService } from '../src/components/telegram-bot/telegram-bot.service';
import { UserEntity, UserDocument } from '../src/schema/User.model';
import { PaymentEntity, PaymentDocument } from '../src/schema/Payment.model';
import { UserAuthType } from '../src/libs/enums/user.enum';

// To'liq AppModule o'rniga faqat kerakli modullar bootstrap qilinadi —
// TelegramBotService.onModuleInit() haqiqiy Telegram API'ga tarmoq
// so'rovi (setMyCommands) yuboradi, bu test muhitida (masalan CI yoki
// tarmoqqa chiqishi cheklangan konteyner) osilib qolishi yoki xato
// berishi mumkin. TelegramBotService shu yerda stub bilan almashtiriladi.

// CLICK haqiqiy pul harakatisiz sinaladi — o'z serverimizga, o'zimiz
// CLICK_SECRET_KEY bilan hisoblagan haqiqiy imzo bilan, xuddi CLICK
// yuboradigan Prepare/Complete so'rovlarini simulyatsiya qilamiz. Bu
// webhook mantig'i (imzo tekshiruvi, holat o'tishlari, balans yozuvi)
// to'g'ri ishlayotganini haqiqiy tranzaksiyasiz tasdiqlaydi.
describe('Payments — Click webhook (e2e)', () => {
  let app: INestApplication;
  let config: ConfigService;
  let userModel: Model<UserDocument>;
  let paymentModel: Model<PaymentDocument>;
  let testUser: UserDocument;
  let token: string;

  const clickSign = (parts: (string | number)[]) =>
    crypto.createHash('md5').update(parts.join('')).digest('hex');

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          // Alohida fayl — ishlayotgan dev-serverning src/schema.gql'ini
          // qisman sxema bilan ustidan yozib qo'ymaslik uchun
          autoSchemaFile: join(process.cwd(), 'test/.tmp-schema.gql'),
          sortSchema: true,
          playground: false,
        }),
        DatabaseModule,
        PaymentsModule,
      ],
    })
      .overrideProvider(TelegramBotService)
      .useValue({ notifyUser: async () => undefined })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    config = moduleFixture.get(ConfigService);
    userModel = moduleFixture.get(getModelToken(UserEntity.name));
    paymentModel = moduleFixture.get(getModelToken(PaymentEntity.name));

    testUser = await userModel.create({
      userAuthType: UserAuthType.TELEGRAM,
      userName: 'E2E',
      userLastName: 'Test',
    });

    token = jwt.sign(
      { userId: testUser.id, userRole: testUser.userRole, groups: [] },
      config.get<string>('JWT_SECRET')!,
      { expiresIn: '5m' },
    );
  });

  afterAll(async () => {
    await paymentModel.deleteMany({ userId: testUser.id });
    await userModel.deleteOne({ _id: testUser.id });
    await app.close();
    await unlink(join(process.cwd(), 'test/.tmp-schema.gql')).catch(
      () => undefined,
    );
  });

  it('completes a Click top-up end to end and credits the balance', async () => {
    const amount = 1000;
    const serviceId = config.get<string>('CLICK_SERVICE_ID')!;
    const secretKey = config.get<string>('CLICK_SECRET_KEY')!;
    const commissionRate = Number(
      config.get<string>('CLICK_COMMISSION_RATE') ?? '0.02',
    );

    const initRes = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `mutation($amount: Int!) {
          initiateClickTopup(amount: $amount) { payUrl payment { id paymentStatus } }
        }`,
        variables: { amount },
      })
      .expect(200);

    expect(initRes.body.errors).toBeUndefined();
    const paymentId: string = initRes.body.data.initiateClickTopup.payment.id;
    expect(initRes.body.data.initiateClickTopup.payment.paymentStatus).toBe(
      'PENDING',
    );

    const clickTransId = `e2e-${Date.now()}`;
    const signTime = new Date().toISOString();

    const prepareBody = {
      click_trans_id: clickTransId,
      service_id: serviceId,
      merchant_trans_id: paymentId,
      amount,
      action: 0,
      error: 0,
      error_note: 'Success',
      sign_time: signTime,
      click_paydoc_id: 'e2e-doc',
    };
    const prepareSign = clickSign([
      clickTransId,
      serviceId,
      secretKey,
      paymentId,
      '',
      amount,
      0,
      signTime,
    ]);

    // Noto'g'ri imzo -1 bilan rad etilishini tekshiramiz (haqiqiy so'rovdan oldin)
    const badSignRes = await request(app.getHttpServer())
      .post('/payments/click/webhook')
      .send({ ...prepareBody, sign_string: 'deadbeef' })
      .expect(200);
    expect(badSignRes.body.error).toBe(-1);

    const prepareRes = await request(app.getHttpServer())
      .post('/payments/click/webhook')
      .send({ ...prepareBody, sign_string: prepareSign })
      .expect(200);
    expect(prepareRes.body.error).toBe(0);
    const merchantPrepareId: string = prepareRes.body.merchant_prepare_id;
    expect(merchantPrepareId).toBe(paymentId);

    const completeBody = {
      click_trans_id: clickTransId,
      service_id: serviceId,
      merchant_trans_id: paymentId,
      merchant_prepare_id: merchantPrepareId,
      amount,
      action: 1,
      error: 0,
      error_note: 'Success',
      sign_time: signTime,
      click_paydoc_id: 'e2e-doc',
    };
    const completeSign = clickSign([
      clickTransId,
      serviceId,
      secretKey,
      paymentId,
      merchantPrepareId,
      amount,
      1,
      signTime,
    ]);

    const completeRes = await request(app.getHttpServer())
      .post('/payments/click/webhook')
      .send({ ...completeBody, sign_string: completeSign })
      .expect(200);
    expect(completeRes.body.error).toBe(0);

    // Takroriy Complete — "Already paid" (-4) qaytarishi kerak
    const dupeRes = await request(app.getHttpServer())
      .post('/payments/click/webhook')
      .send({ ...completeBody, sign_string: completeSign })
      .expect(200);
    expect(dupeRes.body.error).toBe(-4);

    const balanceRes = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: `query { getMyBalance }` })
      .expect(200);
    expect(balanceRes.body.data.getMyBalance).toBe(amount);

    const paymentDoc = await paymentModel.findById(paymentId);
    expect(paymentDoc?.paymentStatus).toBe('CONFIRMED');
    expect(paymentDoc?.clickTransactionId).toBe(clickTransId);
    expect(paymentDoc?.platformFee).toBe(Math.round(amount * commissionRate));
  });
});
