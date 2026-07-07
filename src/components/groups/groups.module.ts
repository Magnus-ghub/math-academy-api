import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsService } from './groups.service';
import { GroupsResolver } from './groups.resolver';
import { GroupEntity, GroupSchema } from '../../schema/Group.model';
import { UserGroupEntity, UserGroupSchema } from '../../schema/User_Group.model';
import { UserEntity, UserSchema } from '../../schema/User.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GroupEntity.name, schema: GroupSchema },
      { name: UserGroupEntity.name, schema: UserGroupSchema },
      { name: UserEntity.name, schema: UserSchema },
    ]),
  ],
  providers: [GroupsService, GroupsResolver],
  exports: [GroupsService],
})
export class GroupsModule {}
