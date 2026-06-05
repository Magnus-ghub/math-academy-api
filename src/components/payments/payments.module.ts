import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsResolver } from './payments.resolver';
import { PaymentEntity } from '../../schema/Payment.model';
import { UserEntity } from '../../schema/User.model';
import { UserGroupEntity } from '../../schema/User_Group.model';
import { GroupEntity } from '../../schema/Group.model';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity, UserEntity, UserGroupEntity, GroupEntity])],
  providers: [PaymentsService, PaymentsResolver],
  exports: [PaymentsService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}