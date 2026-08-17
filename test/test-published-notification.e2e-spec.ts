import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { DatabaseModule } from '../src/database/database.module';
import { TestsModule } from '../src/components/tests/tests.module';
import { TestsService } from '../src/components/tests/tests.service';
import { TelegramBotService } from '../src/components/telegram-bot/telegram-bot.service';
import { UserEntity, UserDocument } from '../src/schema/User.model';
import { GroupEntity, GroupDocument } from '../src/schema/Group.model';
import {
  UserGroupEntity,
  UserGroupDocument,
} from '../src/schema/User_Group.model';
import { TestEntity, TestDocument } from '../src/schema/Test.model';
import {
  NotificationEntity,
  NotificationDocument,
} from '../src/schema/Notification.model';
import { UserAuthType, UserRole, UserStatus } from '../src/libs/enums/user.enum';
import { GroupType } from '../src/libs/enums/group.enum';
import { TestAccess, TestStatus, TestType } from '../src/libs/enums/test.enum';

// Faqat GROUP-access yo'lini tekshiradi — PUBLIC/PREMIUM yo'li "barcha faol
// talabalar"ni nishonga oladi, uni shu dev bazasida ishga tushirish haqiqiy
// talabalarga soxta "yangi test" bildirishnomasi (va Telegram xabari) yuborib
// yuboradi. GROUP yo'li esa faqat o'zimiz yaratgan bitta guruh a'zosiga
// tegishli — real foydalanuvchilarga tegmasdan mexanizmni tekshirish mumkin.
describe('Test published notification (e2e)', () => {
  let app: INestApplication;
  let testsService: TestsService;
  let userModel: Model<UserDocument>;
  let groupModel: Model<GroupDocument>;
  let userGroupModel: Model<UserGroupDocument>;
  let testModel: Model<TestDocument>;
  let notificationModel: Model<NotificationDocument>;

  let memberUser: UserDocument;
  let outsiderUser: UserDocument;
  let group: GroupDocument;
  let testDoc: TestDocument;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        TestsModule,
      ],
    })
      .overrideProvider(TelegramBotService)
      .useValue({ notifyUser: async () => undefined })
      .compile();

    // TestsModule GraphQL'siz ham to'liq DI grafigi bilan yig'iladi — bu
    // test faqat servis darajasida ishlaydi, HTTP/GraphQL qatlamini tekshirmaydi
    app = moduleFixture.createNestApplication();
    await app.init();

    testsService = moduleFixture.get(TestsService);
    userModel = moduleFixture.get(getModelToken(UserEntity.name));
    groupModel = moduleFixture.get(getModelToken(GroupEntity.name));
    userGroupModel = moduleFixture.get(getModelToken(UserGroupEntity.name));
    testModel = moduleFixture.get(getModelToken(TestEntity.name));
    notificationModel = moduleFixture.get(getModelToken(NotificationEntity.name));

    group = await groupModel.create({
      groupType: GroupType.DTM,
      groupName: 'E2E test group',
      telegramChatId: `e2e-${Date.now()}`,
      durationMonths: 1,
    });

    memberUser = await userModel.create({
      userAuthType: UserAuthType.TELEGRAM,
      userRole: UserRole.STUDENT,
      userStatus: UserStatus.ACTIVE,
      userName: 'E2E-Member',
    });
    outsiderUser = await userModel.create({
      userAuthType: UserAuthType.TELEGRAM,
      userRole: UserRole.STUDENT,
      userStatus: UserStatus.ACTIVE,
      userName: 'E2E-Outsider',
    });

    await userGroupModel.create({
      userId: memberUser.id,
      groupId: String(group._id),
      groupType: GroupType.DTM,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    testDoc = await testModel.create({
      testType: TestType.DTM,
      testAccess: TestAccess.GROUP,
      testStatus: TestStatus.DRAFT,
      testTitle: 'E2E published test',
      duration: 60,
      groupId: String(group._id),
      createdBy: 'e2e',
    });
  });

  afterAll(async () => {
    await notificationModel.deleteMany({
      userId: { $in: [memberUser.id, outsiderUser.id] },
    });
    await testModel.deleteOne({ _id: testDoc._id });
    await userGroupModel.deleteMany({ groupId: String(group._id) });
    await groupModel.deleteOne({ _id: group._id });
    await userModel.deleteMany({ _id: { $in: [memberUser.id, outsiderUser.id] } });
    await app.close();
    await unlink(join(process.cwd(), 'test/.tmp-schema.gql')).catch(
      () => undefined,
    );
  });

  it('notifies only active group members when a GROUP test is published', async () => {
    await testsService.updateTest(String(testDoc._id), {
      testStatus: TestStatus.PUBLISHED,
    } as any);

    // notifyTestPublished chaqiruvi fire-and-forget (await qilinmaydi) — DB
    // yozuvi tugashini kutish uchun qisqa poll
    let memberNotifs: NotificationDocument[] = [];
    for (let i = 0; i < 20; i++) {
      memberNotifs = await notificationModel.find({ userId: memberUser.id });
      if (memberNotifs.length > 0) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    expect(memberNotifs).toHaveLength(1);
    expect(memberNotifs[0].title).toBe("Yangi test qo'shildi!");
    expect(memberNotifs[0].testId).toBe(String(testDoc._id));
    expect(memberNotifs[0].link).toBe('/dashboard/tests');
    expect(memberNotifs[0].isRead).toBe(false);

    const outsiderNotifs = await notificationModel.find({
      userId: outsiderUser.id,
    });
    expect(outsiderNotifs).toHaveLength(0);
  });

  it('does not re-notify when an already-published test is edited again', async () => {
    await notificationModel.deleteMany({ userId: memberUser.id });

    await testsService.updateTest(String(testDoc._id), {
      testDesc: 'edited after publish',
    } as any);

    await new Promise((r) => setTimeout(r, 300));
    const notifs = await notificationModel.find({ userId: memberUser.id });
    expect(notifs).toHaveLength(0);
  });
});
