import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import {
  BroadcastAudience,
  BroadcastMediaType,
} from 'src/libs/enums/broadcast.enum';

@InputType()
export class BroadcastInput {
  // Telegram limiti: matn 4096, media izohi 1024 belgi — servisda tekshiriladi.
  // Media bo'lsa matn bo'sh bo'lishi mumkin.
  @Field({ defaultValue: '' })
  @IsString()
  @MaxLength(4096)
  message: string;

  @Field(() => BroadcastAudience)
  @IsEnum(BroadcastAudience)
  audience: BroadcastAudience;

  @Field({ nullable: true })
  // audience=GROUP bo'lganda majburiy — servisda tekshiriladi
  @IsOptional()
  @IsString()
  groupId?: string;

  @Field(() => BroadcastMediaType, { nullable: true })
  @IsOptional()
  @IsEnum(BroadcastMediaType)
  mediaType?: BroadcastMediaType;

  // POST /broadcast/media javobidan olinadi
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  mediaFileId?: string;
}
