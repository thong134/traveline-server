import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Bật validation cho DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // tự bỏ field lạ
      forbidNonWhitelisted: true, // chặn field không khai báo
      transform: true, // tự convert kiểu (e.g. string->number)
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Traveline API')
    .setDescription('REST API documentation for Traveline platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(3000);
  console.log(`\nAPI đang chạy: http://localhost:3000`);
  console.log(`Swagger UI: http://localhost:3000/docs`);
}
void bootstrap();
