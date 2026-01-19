export declare class CreateApiKeyDto {
    name: string;
    storeId?: string;
    allowedOrigins?: string[];
    scopes?: string[];
    expiresAt?: Date;
    prefix?: 'pk_live' | 'pk_test' | 'sk_live';
}
