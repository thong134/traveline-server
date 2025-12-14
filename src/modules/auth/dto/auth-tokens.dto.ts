import { UserRole } from '../../user/entities/user-role.enum';

export interface AuthTokens {
  access_token: string;
  refreshToken: string;
  role: UserRole;
}
