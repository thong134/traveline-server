import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

export const IMAGE_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const VIDEO_ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/webm',
];
export const VIDEO_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const imageMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: IMAGE_MAX_FILE_SIZE,
  },
};

export const mediaMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: VIDEO_MAX_FILE_SIZE,
  },
};
