export interface LoginInput {
  email: string;
  password: string;
  ip?: string;
}

export interface VerifyLoginInput {
  tempToken: string;
  code: string;
  ip?: string;
}

export interface LogoutInput {
  userId: string;
}
