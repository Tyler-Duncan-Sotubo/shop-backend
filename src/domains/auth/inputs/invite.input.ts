export interface InviteUserInput {
  email: string;
  name: string;
  companyRoleId: string; // uuid
}

export interface AcceptInviteInput {
  token: string;
}
