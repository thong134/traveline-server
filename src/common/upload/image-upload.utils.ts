import { BadRequestException } from '@nestjs/common';
import type { Express } from 'express';
import {
  IMAGE_ALLOWED_MIME_TYPES,
  IMAGE_MAX_FILE_SIZE,
  VIDEO_ALLOWED_MIME_TYPES,
  VIDEO_MAX_FILE_SIZE,
} from './image-upload.config';

interface ImageValidationOptions {
  fieldName: string;
  maxSize?: number;
  allowedMimeTypes?: string[];
}

export function assertImageFile(
  file: Express.Multer.File | undefined,
  options: ImageValidationOptions,
): void {
  if (!file) {
    return;
  }

  const allowed = options.allowedMimeTypes ?? IMAGE_ALLOWED_MIME_TYPES;
  if (!allowed.includes(file.mimetype)) {
    throw new BadRequestException(
      `${options.fieldName} phải là file ảnh (${allowed.join(', ')})`,
    );
  }

  const maxSize = options.maxSize ?? IMAGE_MAX_FILE_SIZE;
  if (file.size > maxSize) {
    throw new BadRequestException(
      `${options.fieldName} vượt quá kích thước cho phép (${Math.round(
        maxSize / (1024 * 1024),
      )}MB)`,
    );
  }
}

export function assertVideoFile(
  file: Express.Multer.File | undefined,
  options: ImageValidationOptions,
): void {
  if (!file) {
    return;
  }

  const allowed = options.allowedMimeTypes ?? VIDEO_ALLOWED_MIME_TYPES;
  if (!allowed.includes(file.mimetype)) {
    throw new BadRequestException(
      `${options.fieldName} phải là file video (${allowed.join(', ')})`,
    );
  }

  const maxSize = options.maxSize ?? VIDEO_MAX_FILE_SIZE;
  if (file.size > maxSize) {
    throw new BadRequestException(
      `${options.fieldName} vượt quá kích thước cho phép (${Math.round(
        maxSize / (1024 * 1024),
      )}MB)`,
    );
  }
}
