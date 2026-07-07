import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { UserEntity, UserSchema } from '../../schema/User.model';
import { UserGroupEntity, UserGroupSchema } from '../../schema/User_Group.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserEntity.name, schema: UserSchema },
      { name: UserGroupEntity.name, schema: UserGroupSchema },
    ]),
  ],
  providers: [UsersService, UsersResolver],
  exports: [UsersService],
})
export class UsersModule {}
