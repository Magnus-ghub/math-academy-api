import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentService } from './content.service';
import { ContentResolver } from './content.resolver';
import { ContentEntity } from '../../schema/Content.model';
import { GroupEntity } from '../../schema/Group.model';
import { UserGroupEntity } from '../../schema/User_Group.model';

@Module({
  imports: [TypeOrmModule.forFeature([ContentEntity, GroupEntity, UserGroupEntity])],
  providers: [ContentService, ContentResolver],
  exports: [ContentService],
})
export class ContentModule {}
