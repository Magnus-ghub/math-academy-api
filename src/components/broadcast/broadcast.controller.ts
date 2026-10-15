import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../../libs/enums/user.enum';
import { BroadcastService } from './broadcast.service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
];

@Controller('broadcast')
export class BroadcastController {
  constructor(private broadcastService: BroadcastService) {}

  // E'lon uchun rasm/video yuklash — fayl diskda saqlanmaydi, to'g'ridan-to'g'ri
  // Telegram'ga joylanadi va sendBroadcast'ga beriladigan file_id qaytariladi.
  @Post('media')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Faqat rasm (JPG, PNG, WEBP) yoki video (MP4) yuklash mumkin',
            ),
            false,
          );
        }
        cb(null, true);
      },
      // Bot API orqali yuklanadigan videoning eng katta hajmi
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadMedia(
    @Req() req: { user?: { userId: string; userRole: UserRole } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (req.user?.userRole !== UserRole.ADMIN) throw new ForbiddenException();
    if (!file) throw new BadRequestException('Fayl yuklanmadi');
    return this.broadcastService.uploadMedia(req.user.userId, file);
  }
}
