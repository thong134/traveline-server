
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
      destination_check: { status: string; response: any; error: any };
      route_check: { status: string; response: any; error: any };
      vision_check: { status: string; response: any; error: any };
    } = {
      config: {
        raw_url: rawUrl,
        used_url: baseUrl,
        vercel_env: process.env.VERCEL,
      },
      ping: { status: 'pending', latency: null, error: null },
      moderation_check: { status: 'pending', response: null, error: null },
      destination_check: { status: 'pending', response: null, error: null },
      route_check: { status: 'pending', response: null, error: null },
      vision_check: { status: 'pending', response: null, error: null },
    };

    const start = Date.now();
    try {
      // 1. Check Health Endpoint
      const healthRes = await firstValueFrom(
        this.httpService.get(`${baseUrl}/health`, { timeout: 20000 }),
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
        status: err.response?.status,
        data: err.response?.data,
      };
    }

    // 2. Moderation Check
    try {
      const modRes = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/moderation/predict`,
          { text: 'ping' },
          { timeout: 90000 }
        ),
      );
      results.moderation_check.status = 'ok';
      results.moderation_check.response = modRes.data;
    } catch (e) {
      const err = e as AxiosError;
      results.moderation_check.status = 'failed';
      results.moderation_check.error = {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      };
    }

    // 3. Destination Check
    try {
      const destRes = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/recommend/destinations`,
          { 
            hobbies: ['Nature'], 
            limit: 1,
            province: 'Đà Nẵng' 
          },
          { timeout: 90000 }
        ),
      );
      results.destination_check.status = 'ok';
      results.destination_check.response = destRes.data;
    } catch (e) {
      const err = e as AxiosError;
      results.destination_check.status = 'failed';
      results.destination_check.error = {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      };
    }

    // 4. Route Check
    try {
      const routeRes = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/recommend/route`,
          { 
            hobbies: ['Nature'], 
            province: 'Đà Nẵng',
            startDate: '2024-01-01',
            endDate: '2024-01-03'
          },
          { timeout: 90000 }
        ),
      );
      results.route_check.status = 'ok';
      results.route_check.response = routeRes.data;
    } catch (e) {
      const err = e as AxiosError;
      results.route_check.status = 'failed';
      results.route_check.error = {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      };
    }

    // 5. Vision Check (Ping only, since it requires image)
    // We can't easily send an image here without valid URL, but we can try handling empty payload error to verify endpoint reachability
    try {
       // Just check if endpoint is reachable (expecting 400 Bad Request due to missing image, or 503 if model missing)
      const visionRes = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/vision/classify`,
          {}, // Empty payload
          { timeout: 90000 }
        ),
      );
      results.vision_check.status = 'ok'; // Unexpected success with empty payload
      results.vision_check.response = visionRes.data;
    } catch (e) {
      const err = e as AxiosError;
      // If 400, it means service is UP but compliant about missing image -> OK
      if (err.response?.status === 400) {
          results.vision_check.status = 'ok (verified via 400)';
          results.vision_check.response = err.response.data;
      } else {
          results.vision_check.status = 'failed';
          results.vision_check.error = {
            message: err.message,
            status: err.response?.status,
            data: err.response?.data,
          };
      }
    }

    return results;
  }
}
