import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContentService } from './content.service';
import { ContentResolver } from './content.resolver';
import { ContentEntity, ContentSchema } from '../../schema/Content.model';
import { GroupEntity, GroupSchema } from '../../schema/Group.model';
import { UserGroupEntity, UserGroupSchema } from '../../schema/User_Group.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContentEntity.name, schema: ContentSchema },
      { name: GroupEntity.name, schema: GroupSchema },
      { name: UserGroupEntity.name, schema: UserGroupSchema },
    ]),
  ],
  providers: [ContentService, ContentResolver],
  exports: [ContentService],
})
export class ContentModule {}
