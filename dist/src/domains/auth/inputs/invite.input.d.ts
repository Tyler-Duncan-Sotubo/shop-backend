export interface InviteUserInput {
    email: string;
    name: string;
    companyRoleId: string;
}
export interface AcceptInviteInput {
    token: string;
}
