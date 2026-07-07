import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecoveryService } from './recovery.service';
import { RecoveryResolver } from './recovery.resolver';
import { RecoveryRequestEntity, RecoveryRequestSchema } from '../../schema/RecoveryRequest.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RecoveryRequestEntity.name, schema: RecoveryRequestSchema },
    ]),
  ],
  providers: [RecoveryService, RecoveryResolver],
})
export class RecoveryModule {}
