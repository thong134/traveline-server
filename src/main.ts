import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Bật validation cho DTO
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,                // tự bỏ field lạ
    forbidNonWhitelisted: true,     // chặn field không khai báo
    transform: true,                // tự convert kiểu (e.g. string->number)
  }));

  await app.listen(3000);
  console.log(`\nAPI đang chạy: http://localhost:3000`);
}
bootstrap();