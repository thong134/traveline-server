import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';
import type { Express } from 'express';

export interface UploadMediaOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}

export interface UploadMediaResult {
  url: string;
  publicId: string;
}

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
    if (this.isConfigured()) {
      return;
    }

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
    file: Express.Multer.File,
    options: UploadMediaOptions,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: options.folder ?? 'traveline/uploads',
          public_id: options.publicId,
          overwrite: options.overwrite ?? true,
          resource_type: options.resourceType ?? 'image',
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

  async uploadMedia(
    file: Express.Multer.File,
    options: UploadMediaOptions = {},
  ): Promise<UploadMediaResult> {
    this.ensureConfigured();

    try {
      const result = await this.uploadFromBuffer(file, options);

      if (!result.secure_url || !result.public_id) {
        throw new Error('Cloudinary response missing secure_url or public_id');
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      throw this.createCloudinaryException(
        'CLOUDINARY_UPLOAD_FAILED',
        error,
        'Upload ảnh thất bại',
      );
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    options: UploadMediaOptions = {},
  ): Promise<UploadMediaResult> {
    return this.uploadMedia(file, { ...options, resourceType: 'image' });
  }

  async uploadVideo(
    file: Express.Multer.File,
    options: UploadMediaOptions = {},
  ): Promise<UploadMediaResult> {
    return this.uploadMedia(file, { ...options, resourceType: 'video' });
  }

  /**
   * Upload an image from a base64 data URI string
   * @param dataUri - Format: data:image/jpeg;base64,/9j/4AAQ...
   * @param folder - Cloudinary folder to upload to
   */
  async uploadBase64Image(
    dataUri: string,
    folder: string = 'chatbot_images',
  ): Promise<UploadApiResponse> {
    this.ensureConfigured();

    try {
      const result = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: 'image',
      });
      return result;
    } catch (error) {
      throw this.createCloudinaryException(
        'CLOUDINARY_UPLOAD_FAILED',
        error,
        'Upload ảnh base64 thất bại',
      );
    }
  }

  async deleteImage(publicId: string | null | undefined): Promise<void> {
    if (!publicId) {
      return;
    }

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

  async deleteVideo(publicId: string | null | undefined): Promise<void> {
    if (!publicId) {
      return;
    }

    this.ensureConfigured();

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    } catch (error) {
      throw this.createCloudinaryException(
        'CLOUDINARY_DELETE_FAILED',
        error,
        'Xoá video trên Cloudinary thất bại',
      );
    }
  }

  /**
   * Trích xuất publicId từ URL Cloudinary
   * URL format: https://res.cloudinary.com/<cloud>/image/upload/v<version>/<publicId>.<ext>
   */
  extractPublicIdFromUrl(url: string): string | null {
    try {
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}
