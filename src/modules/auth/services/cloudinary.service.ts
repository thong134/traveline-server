import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import type { UploadedAvatarFile } from '../types/uploaded-file.type';

@Injectable()
export class CloudinaryService {
  private readonly cloudName: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly apiSecret: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    this.apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    this.apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (this.isConfigured()) {
      cloudinary.config({
        cloud_name: this.cloudName,
        api_key: this.apiKey,
        api_secret: this.apiSecret,
      });
    }
  }

  private isConfigured(): boolean {
    return Boolean(this.cloudName && this.apiKey && this.apiSecret);
  }

  async uploadAvatar(file: UploadedAvatarFile): Promise<string> {
    if (!this.isConfigured()) {
      throw new InternalServerErrorException(
        'Cloudinary chưa được cấu hình. Vui lòng thiết lập biến môi trường CLOUDINARY_*',
      );
    }

    const resource = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    try {
      const result: UploadApiResponse | UploadApiErrorResponse =
        await cloudinary.uploader.upload(resource, {
          folder: 'traveline/avatars',
          overwrite: true,
        });

      if ('secure_url' in result && result.secure_url) {
        return result.secure_url;
      }

      throw new InternalServerErrorException('Không thể tải ảnh lên Cloudinary');
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Upload ảnh thất bại',
      );
    }
  }
}
