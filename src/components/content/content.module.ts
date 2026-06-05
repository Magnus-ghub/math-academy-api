import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentService } from './content.service';
import { ContentResolver } from './content.resolver';
import { ContentEntity } from '../../schema/Content.model';

@Module({
  imports: [TypeOrmModule.forFeature([ContentEntity])],
  providers: [ContentService, ContentResolver],
  exports: [ContentService],
})
export class ContentModule {}
