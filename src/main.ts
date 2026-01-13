import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { LocalTimeInterceptor } from './common/interceptors/local-time.interceptor';

process.env.TZ = 'Asia/Ho_Chi_Minh';

const expressApp = express();
let cachedApp: INestApplication;

async function createServer(): Promise<INestApplication> {
  if (cachedApp) return cachedApp;

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  // Allow local frontend (3001) to call the API during dev
  app.enableCors({
    origin: ['http://localhost:3001', '*'],
    credentials: true,
  });

  // Bật validation cho DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // tự bỏ field lạ
      transform: true, // tự convert kiểu (e.g. string->number)
      forbidNonWhitelisted: true, // chặn field không khai báo
    }),
  );

  app.useGlobalInterceptors(new LocalTimeInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Traveline API')
    .setDescription('Tài liệu API cho đồ án Traveline')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.init();
  cachedApp = app;
  return app;
}

// Chế độ 1: Chạy standalone (Local development)
async function bootstrap() {
  const app = await createServer();
  const portValue =
    process.env.PORT ?? process.env.APP_PORT ?? process.env.HTTP_PORT ?? '3000';
  const port = Number.isFinite(Number(portValue)) ? Number(portValue) : 3000;

  await app.listen(port);
  console.log(`\nMODE: STANDALONE`);
  console.log(`API đang chạy: http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/docs`);
}

// Chế độ 2: Chạy trên Vercel (Serverless)
if (!process.env.VERCEL) {
  void bootstrap();
}

// Export server cho Vercel handler
export default async (req: any, res: any) => {
  await createServer();
  expressApp(req, res);
};
