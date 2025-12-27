import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';
process.env.TZ = 'Asia/Ho_Chi_Minh';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow local frontend (3001) to call the API during dev
  app.enableCors({
    origin: ['http://localhost:3001'],
    credentials: true,
  });

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

  const portValue =
    process.env.PORT ?? process.env.APP_PORT ?? process.env.HTTP_PORT ?? '3000';
  const port = Number.isFinite(Number(portValue)) ? Number(portValue) : 3000;

  await app.listen(port);
  console.log(`\nAPI đang chạy: http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/docs`);
}
void bootstrap();
