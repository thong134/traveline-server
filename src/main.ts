import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { LocalTimeInterceptor } from './common/interceptors/local-time.interceptor';

process.env.TZ = 'Asia/Ho_Chi_Minh';

const server = express();

async function createServer() {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
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
      forbidNonWhitelisted: true, // chặn field không khai báo
      transform: true, // tự convert kiểu (e.g. string->number)
    }),
  );

  app.useGlobalInterceptors(new LocalTimeInterceptor());

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

  await app.init();
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
  server(req, res);
};
