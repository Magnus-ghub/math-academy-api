import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';

import { AppResolver } from './app.resolver';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './components/auth/auth.module';
import { UsersModule } from './components/users/users.module';
import { GroupsModule } from './components/groups/groups.module';
import { TestsModule } from './components/tests/tests.module';
import { ResultsModule } from './components/results/results.module';
import { PaymentsModule } from './components/payments/payments.module';
import { ContentModule } from './components/content/content.module';
import { CommentModule } from './components/comment/comment.module';
import { ReportModule } from './components/report/report.module';
import { UploadModule } from './components/upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      subscriptions: {
        'graphql-ws': true,
      },
    }),

    DatabaseModule,

    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    GroupsModule,
    TestsModule,
    ResultsModule,
    PaymentsModule,
    ContentModule,
    CommentModule,
    ReportModule,
    UploadModule,
  ],
  providers: [AppResolver],
})
export class AppModule {}
