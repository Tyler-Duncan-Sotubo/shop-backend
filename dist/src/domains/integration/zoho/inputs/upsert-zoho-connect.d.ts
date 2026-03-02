export interface UpsertZohoConnectionDto {
    refreshToken: string;
    region?: string;
    zohoOrganizationId?: string | null;
    zohoOrganizationName?: string | null;
    accessToken?: string | null;
    accessTokenExpiresAt?: Date | null;
    isActive?: boolean;
}
