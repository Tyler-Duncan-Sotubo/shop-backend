export interface RequestPasswordResetInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
  ip?: string;
}

export interface ResetInvitationPasswordInput {
  token: string;
  newPassword: string;
}
