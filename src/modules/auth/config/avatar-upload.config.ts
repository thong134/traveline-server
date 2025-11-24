import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

export const AVATAR_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
export const AVATAR_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const avatarUploadOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: AVATAR_MAX_FILE_SIZE,
  },
};
