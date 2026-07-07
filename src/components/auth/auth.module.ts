import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthResolver } from './ auth.resolver';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { UserEntity, UserSchema } from 'src/schema/User.model';
import { GroupEntity, GroupSchema } from 'src/schema/Group.model';
import { UserGroupEntity, UserGroupSchema } from 'src/schema/User_Group.model';
import { AuthController } from './auth.controller';


@Module({
  controllers: [AuthController],
  imports: [
    PassportModule,
    MongooseModule.forFeature([
      { name: UserEntity.name, schema: UserSchema },
      { name: GroupEntity.name, schema: GroupSchema },
      { name: UserGroupEntity.name, schema: UserGroupSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, AuthResolver, JwtStrategy, GoogleStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
