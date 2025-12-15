import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';
import type { UploadedAvatarFile } from '../types/uploaded-file.type';

export type UploadAvatarResult = {
  publicId: string;
  url: string;
};

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

  private ensureConfigured(): void {
    if (this.isConfigured()) return;
    throw new InternalServerErrorException({
      code: 'CLOUDINARY_NOT_CONFIGURED',
      message:
        'Cloudinary chưa được cấu hình. Vui lòng thiết lập biến môi trường CLOUDINARY_*',
    });
  }

  private createCloudinaryException(
    code: string,
    error: unknown,
    fallbackMessage: string,
  ): InternalServerErrorException {
    const message =
      (error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message)
        : undefined) || fallbackMessage;

    const meta =
      error && typeof error === 'object'
        ? Object.fromEntries(
            Object.entries(error as Record<string, unknown>).filter(
              ([, value]) =>
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean',
            ),
          )
        : undefined;

    return new InternalServerErrorException({
      code,
      message,
      ...(meta ? { meta } : {}),
    });
  }

  private uploadFromBuffer(
    file: UploadedAvatarFile,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: 'traveline/avatars',
          resource_type: 'image',
          overwrite: true,
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result) {
            reject(new Error('Cloudinary trả về kết quả rỗng'));
            return;
          }

          resolve(result);
        },
      );

      upload.end(file.buffer);
    });
  }

  async uploadAvatar(file: UploadedAvatarFile): Promise<UploadAvatarResult> {
    this.ensureConfigured();

    try {
      const result = await this.uploadFromBuffer(file);

      if (!result.secure_url || !result.public_id) {
        throw new Error('Cloudinary response missing secure_url or public_id');
      }

      return {
        publicId: result.public_id,
        url: result.secure_url,
      };
    } catch (error) {
      throw this.createCloudinaryException(
        'CLOUDINARY_UPLOAD_FAILED',
        error,
        'Upload ảnh thất bại',
      );
    }
  }

  async deleteImage(publicId: string | null | undefined): Promise<void> {
    if (!publicId) return;
    this.ensureConfigured();

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
      throw this.createCloudinaryException(
        'CLOUDINARY_DELETE_FAILED',
        error,
        'Xoá ảnh trên Cloudinary thất bại',
      );
    }
  }
}
