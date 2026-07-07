import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service';
import { PaymentsResolver } from './payments.resolver';
import { PaymentEntity, PaymentSchema } from '../../schema/Payment.model';
import { UserEntity, UserSchema } from '../../schema/User.model';
import { UserGroupEntity, UserGroupSchema } from '../../schema/User_Group.model';
import { GroupEntity, GroupSchema } from '../../schema/Group.model';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentEntity.name, schema: PaymentSchema },
      { name: UserEntity.name, schema: UserSchema },
      { name: UserGroupEntity.name, schema: UserGroupSchema },
      { name: GroupEntity.name, schema: GroupSchema },
    ]),
  ],
  providers: [PaymentsService, PaymentsResolver],
  exports: [PaymentsService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
