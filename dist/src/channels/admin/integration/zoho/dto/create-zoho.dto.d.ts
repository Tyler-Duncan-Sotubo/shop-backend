export declare const AllowedZohoRegions: readonly ["com", "eu", "in", "com.au", "jp", "ca", "sa"];
export declare class CreateZohoDto {
    refreshToken: string;
    region?: string;
    zohoOrganizationId?: string;
    zohoOrganizationName?: string;
    accessToken?: string;
    accessTokenExpiresAt?: Date | null | undefined;
    isActive?: boolean;
}
