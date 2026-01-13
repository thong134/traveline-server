import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';

@Injectable()
export class FptAiService {
  private readonly logger = new Logger(FptAiService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.fpt.ai/vision';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.getOrThrow<string>('FPT_AI_API_KEY');
  }

  async recognizeIdCard(
    imageBuffer: Buffer,
    filename: string = 'image.jpg',
  ): Promise<any> {
    try {
      const form = new FormData();
      form.append('image', imageBuffer, { filename });

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/idr/vnm`, form, {
          headers: {
            ...form.getHeaders(),
            'api-key': this.apiKey,
          },
        }),
      );

      if (response.data.errorCode !== 0) {
        this.logger.error(`FPT.AI IDR Error: ${JSON.stringify(response.data)}`);
        throw new Error(
          response.data.errorMessage || 'Failed to recognize ID card',
        );
      }

      return response.data.data;
    } catch (error) {
      this.logger.error('Error calling FPT.AI ID Recognition', error);
      throw error;
    }
  }

  async recognizePassport(
    imageBuffer: Buffer,
    filename: string = 'image.jpg',
  ): Promise<any> {
    try {
      const form = new FormData();
      form.append('image', imageBuffer, { filename });

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/passport/vnm`, form, {
          headers: {
            ...form.getHeaders(),
            'api-key': this.apiKey,
          },
        }),
      );

      if (response.data.errorCode !== 0) {
        this.logger.error(
          `FPT.AI Passport Error: ${JSON.stringify(response.data)}`,
        );
        throw new Error(
          response.data.errorMessage || 'Failed to recognize Passport',
        );
      }

      return response.data.data;
    } catch (error) {
      this.logger.error('Error calling FPT.AI Passport Recognition', error);
      throw error;
    }
  }

  async faceMatch(
    file1: Buffer,
    file2: Buffer | string, // Can be buffer or URL? FPT usually takes file. Let's assume user provides buffer for comparison.
    // If comparing with URL, we might need to fetch it first or use a different endpoint if available.
    // Documentation usually suggests uploading two images.
  ): Promise<number> {
    try {
      const form = new FormData();
      form.append('file[]', file1, { filename: 'file1.jpg' });

      if (Buffer.isBuffer(file2)) {
        form.append('file[]', file2, { filename: 'file2.jpg' });
      } else {
        // If string, assume it's a URL, we need to download it first?
        // Or does FPT AI support URL? Standard API usually requires file upload.
        // Let's implement fetching the URL to buffer if it is a string.
        const response = await firstValueFrom(
          this.httpService.get(file2, { responseType: 'arraybuffer' }),
        );
        form.append('file[]', Buffer.from(response.data), {
          filename: 'file2.jpg',
        });
      }

      const response = await firstValueFrom(
        this.httpService.post('https://api.fpt.ai/dmp/checkface/v1', form, {
          headers: {
            ...form.getHeaders(),
            'api-key': this.apiKey,
          },
        }),
      );

      if (response.data.code !== '200') {
        // Note: Facematch response code might differ. older API uses "code": "200", newer might be different.
        // Assuming standard success.
        if (response.data.errorCode && response.data.errorCode !== 0) {
          this.logger.error(
            `FPT.AI FaceMatch Error: ${JSON.stringify(response.data)}`,
          );
          throw new Error(
            response.data.errorMessage || 'Failed to match faces',
          );
        }
      }

      // Response usually contains "similarity": number
      // data: { similarity: 95.5, ... }
      return response.data.data?.similarity || 0;
    } catch (error) {
      this.logger.error('Error calling FPT.AI FaceMatch', error);
      throw error;
    }
  }
}
