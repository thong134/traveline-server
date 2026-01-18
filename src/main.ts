import 'reflect-metadata';
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

  console.log('--- Khởi tạo NestJS Application ---');
  
  if (!process.env.DATABASE_URL) {
    console.error('CRITICAL ERROR: DATABASE_URL is not defined in environment variables!');
  }

  try {
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );

    app.enableCors({
      origin: ['http://localhost:3001', 'https://travelineweb.netlify.app'],
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
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

    console.log('Đang chạy app.init()...');
    await app.init();
    console.log('app.init() thành công.');
    
    cachedApp = app;
    return app;
  } catch (err) {
    console.error('Lỗi khi khởi tạo NestJS:', err);
    throw err;
  }
}

// Chế độ 1: Chạy standalone (Local development)
async function bootstrap() {
  try {
    const app = await createServer();
    const portValue =
      process.env.PORT ?? process.env.APP_PORT ?? process.env.HTTP_PORT ?? '3000';
    const port = Number.isFinite(Number(portValue)) ? Number(portValue) : 3000;

    await app.listen(port);
    console.log(`\nMODE: STANDALONE`);
    console.log(`API đang chạy: http://localhost:${port}`);
    console.log(`Swagger UI: http://localhost:${port}/docs`);
  } catch (err) {
    console.error('Bootstrap failed:', err);
  }
}

// Chế độ 2: Chạy trên Vercel (Serverless)
if (!process.env.VERCEL) {
  void bootstrap();
}

// Export server cho Vercel handler
export default async (req: any, res: any) => {
  try {
    console.log(`--- Request: ${req.method} ${req.url} ---`);
    await createServer();
    expressApp(req, res);
  } catch (err) {
    console.error('Vercel Handler Error:', err);
    res.status(500).send('Internal Server Error during initialization');
  }
};
