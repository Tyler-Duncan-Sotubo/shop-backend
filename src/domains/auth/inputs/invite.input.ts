export interface InviteUserInput {
  email: string;
  name: string;

  // Assign existing role
  companyRoleId?: string;
  roleName?: string;

  // Or create a role during invite
  createRole?: boolean;
  baseRoleId?: string; // optional template
  permissionIds?: string[]; // required if creating
}

export interface AcceptInviteInput {
  token: string;
}
