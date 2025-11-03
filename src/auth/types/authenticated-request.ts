import type { Request as ExpressRequest } from 'express';

export interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: number;
    username: string;
  };
}
