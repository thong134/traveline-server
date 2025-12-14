export enum UserRole {
  User = 'user',
  Admin = 'admin',
}

export const USER_ROLE_VALUES = [UserRole.User, UserRole.Admin] as const;
