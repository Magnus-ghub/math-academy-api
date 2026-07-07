import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RecoveryRequestEntity, RecoveryRequestDocument } from '../../schema/RecoveryRequest.model';
import { RecoveryStatus } from '../../libs/enums/recovery.enum';
import { RecoveryRequestInput } from 'src/libs/dto/recovery/recoveryRequestInput';

@Injectable()
export class RecoveryService {
  constructor(
    @InjectModel(RecoveryRequestEntity.name)
    private recoveryModel: Model<RecoveryRequestDocument>,
  ) {}

  async submitRequest(input: RecoveryRequestInput): Promise<boolean> {
    await this.recoveryModel.create(input);
    return true;
  }

  async getRequests(): Promise<RecoveryRequestDocument[]> {
    return this.recoveryModel.find().sort({ createdAt: -1 });
  }

  async resolveRequest(id: string): Promise<RecoveryRequestDocument> {
    const request = await this.recoveryModel.findByIdAndUpdate(
      id,
      { $set: { status: RecoveryStatus.RESOLVED } },
      { new: true },
    );
    if (!request) throw new NotFoundException('So\'rov topilmadi');
    return request;
  }
}
