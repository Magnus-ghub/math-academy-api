import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';

import { AppResolver } from './app.resolver';

import { UserEntity } from './schema/User.model';
import { GroupEntity } from './schema/Group.model';
import { UserGroupEntity } from './schema/User_Group.model';
import { TestEntity } from './schema/Test.model';
import { QuestionEntity } from './schema/Question.model';
import { ResultEntity } from './schema/Result.model';
import { PaymentEntity } from './schema/Payment.model';
import { ContentEntity } from './schema/Content.model';
import { CommentEntity } from './schema/Comment.model';
import { ReportEntity } from './schema/Report.model';
import { AuthModule } from './components/auth/auth.module';
import { UsersModule } from './components/users/users.module';
import { GroupsModule } from './components/groups/groups.module';
import { TestsModule } from './components/tests/tests.module';
import { ResultsModule } from './components/results/results.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host:     config.get('DB_HOST'),
        port:     config.get<number>('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        entities: [
          UserEntity,
          GroupEntity,
          UserGroupEntity,
          TestEntity,
          QuestionEntity,
          ResultEntity,
          PaymentEntity,
          ContentEntity,
          CommentEntity,
          ReportEntity,
        ],
        synchronize: true,
        logging:     false,
      }),
      inject: [ConfigService],
    }),

    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    GroupsModule,
    TestsModule,
    ResultsModule,
  ],
  providers: [AppResolver],
})
export class AppModule {}