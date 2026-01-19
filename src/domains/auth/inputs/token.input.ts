export interface RefreshTokenInput {
  token: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface ResendVerificationEmailInput {
  userId: string;
}
