import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { GroupsResolver } from './groups.resolver';
import { GroupEntity } from '../../schema/Group.model';
import { UserGroupEntity } from '../../schema/User_Group.model';

@Module({
  imports: [TypeOrmModule.forFeature([GroupEntity, UserGroupEntity])],
  providers: [GroupsService, GroupsResolver],
  exports: [GroupsService],
})
export class GroupsModule {}