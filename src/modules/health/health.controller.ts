
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Controller('health')
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  @Get('ai-test')
  async checkAiConnection() {
    const rawUrl =
      this.configService.get<string>('AI_REVIEW_BASE_URL') ??
      this.configService.get<string>('AI_SERVICE_URL') ??
      'http://localhost:8000';

    const baseUrl = rawUrl.replace(/\/+$/, '');
    
    const results: {
      config: any;
      ping: { status: string; latency: string | null; error: any };
      moderation_check: { status: string; response: any; error: any };
    } = {
      config: {
        raw_url: rawUrl,
        used_url: baseUrl,
        vercel_env: process.env.VERCEL,
      },
      ping: {
        status: 'pending',
        latency: null,
        error: null,
      },
      moderation_check: {
        status: 'pending',
        response: null,
        error: null,
      },
    };

    const start = Date.now();
    try {
      // 1. Check Health Endpoint
      const healthRes = await firstValueFrom(
        this.httpService.get(`${baseUrl}/health`, { timeout: 15000 }), // Longer timeout for cold start
      );
      results.ping.status = 'ok';
      results.ping.latency = `${Date.now() - start}ms`;
      results.ping.error = healthRes.data;
    } catch (e) {
      const err = e as AxiosError;
      results.ping.status = 'failed';
      results.ping.latency = `${Date.now() - start}ms`;
      results.ping.error = {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        data: err.response?.data,
      };
    }

    try {
      // 2. Check Moderation Endpoint (to see specific service error)
      const modRes = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/moderation/predict`,
          { text: 'ping' },
          { timeout: 15000 }
        ),
      );
      results.moderation_check.status = 'ok';
      results.moderation_check.response = modRes.data;
    } catch (e) {
      const err = e as AxiosError;
      results.moderation_check.status = 'failed';
      results.moderation_check.error = {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        data: err.response?.data,
      };
    }

    return results;
  }
}
