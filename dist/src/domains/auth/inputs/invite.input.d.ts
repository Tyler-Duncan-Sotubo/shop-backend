export interface InviteUserInput {
    email: string;
    name: string;
    companyRoleId?: string;
    roleName?: string;
    createRole?: boolean;
    baseRoleId?: string;
    permissionIds?: string[];
}
export interface AcceptInviteInput {
    token: string;
}
