import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

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
  origin: [
    'http://localhost:3000',
    'http://localhost:4006',
    'http://cuben.info',
    'http://www.cuben.info',
  ],
  credentials: true,
});

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
