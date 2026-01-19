import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { TokenGeneratorService } from 'src/domains/auth/services';
export declare class CartTokenService {
    private readonly db;
    private readonly tokenGenerator;
    constructor(db: db, tokenGenerator: TokenGeneratorService);
    private hashToken;
    private isExpired;
    private computeCartExpiryFromNow;
    refreshCartAccessToken(args: {
        companyId: string;
        cartId: string;
        refreshToken: string;
    }): Promise<{
        cart: any;
        accessToken: string;
        rotated: boolean;
    }>;
    validateOrRotateGuestToken(args: {
        companyId: string;
        cartId: string;
        token: string;
        extendHours?: number;
    }): Promise<{
        cart: any;
        token: string;
        rotated: boolean;
    }>;
}
