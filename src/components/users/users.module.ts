import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { UserEntity } from '../../schema/User.model';
import { UserGroupEntity } from '../../schema/User_Group.model';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserGroupEntity])],
  providers: [UsersService, UsersResolver],
  exports: [UsersService],
})
export class UsersModule {}