import { db } from 'src/drizzle/types/drizzle';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
export declare class CustomerAuthService {
    private readonly db;
    private readonly configService;
    private readonly jwtService;
    constructor(db: db, configService: ConfigService, jwtService: JwtService);
    private normalizeEmail;
    findCredentialsByEmail(companyId: string, email: string): Promise<{
        id: string;
        companyId: string;
        customerId: string;
        email: string;
        passwordHash: string | null;
        isVerified: boolean;
    }>;
    private issueTokens;
    private buildDisplayName;
    register(companyId: string, dto: RegisterCustomerDto): Promise<{
        customer: {
            id: string;
            companyId: string;
            email: string;
            name: string;
        };
        tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
        };
    }>;
    login(companyId: string, dto: LoginCustomerDto): Promise<{
        customer: {
            id: string;
            companyId: string;
            email: string;
            name: string;
        };
        tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
        };
    }>;
    updatePassword(companyId: string, authCustomer: {
        id: string;
        companyId: string;
    }, input: {
        currentPassword: string;
        newPassword: string;
    }): Promise<{
        ok: boolean;
        tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
        };
    }>;
}
