import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { InviteUserInput, UpdateProfileInput } from '../inputs';
export declare class UserService {
    private readonly db;
    private readonly awsService;
    private readonly cacheService;
    constructor(db: db, awsService: AwsService, cacheService: CacheService);
    findUserByEmail(email: string): Promise<{
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        password: string;
        isVerified: boolean;
        isActive: boolean;
        lastLogin: Date | null;
        createdAt: Date;
        updatedAt: Date;
        avatar: string | null;
        companyId: string;
        companyRoleId: string;
        verificationCode: string | null;
        verificationCodeExpiresAt: Date | null;
        allowMarketingEmails: boolean;
        onboardingCompleted: boolean;
    }>;
    getUserProfile(userId: string): Promise<{
        id: string;
        email: string;
        role: "owner" | "manager" | "staff" | "support";
        first_name: string | null;
        last_name: string | null;
        avatar: string | null;
    }>;
    updateUserProfile(userId: string, dto: UpdateProfileInput): Promise<{
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        avatar: string | null;
        companyId: string;
    }>;
    companyUsers(companyId: string): Promise<{
        id: string;
        email: string;
        role: "owner" | "manager" | "staff" | "support";
        firstName: string | null;
        lastName: string | null;
        avatar: string | null;
        lastLogin: Date | null;
    }[]>;
    editUserRole(userId: string, dto: InviteUserInput): Promise<void>;
}
