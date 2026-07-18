import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';
import { setDefaultResultOrder } from 'dns';
import { setDefaultAutoSelectFamily } from 'net';

// Ba'zi mahalliy tarmoqlarda IPv6 marshruti yo'q/uzilib qoladi. Node'ning
// Happy Eyeballs (autoSelectFamily) mexanizmi IPv6'ni ham sinab ko'rib,
// ~250ms ichida javob kelmasa butun so'rovni ETIMEDOUT bilan bekor qiladi
// (masalan Telegram API'ga — node-fetch/Telegraf shu tarzda qulaydi).
// IPv6'ni butunlay o'chirib, faqat IPv4'dan foydalanamiz.
setDefaultAutoSelectFamily(false);
setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      const allowed = [
        'https://edufly.uz',
        'https://www.edufly.uz',
        process.env.FRONTEND_URL,
      ].filter(Boolean);
      if (allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: ${origin} not allowed`));
      }
    },
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
