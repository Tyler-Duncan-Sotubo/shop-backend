import { db } from 'src/drizzle/types/drizzle';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { AwsService } from 'src/common/aws/aws.service';
import { CacheService } from 'src/common/cache/cache.service';
import { InviteUserDto } from '../dto/invite-user.dto';
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
    }>;
    getUserProfile(userId: string): Promise<{
        id: string;
        email: string;
        role: "owner" | "manager" | "staff" | "support";
        first_name: string | null;
        last_name: string | null;
        avatar: string | null;
    }>;
    updateUserProfile(userId: string, dto: UpdateProfileDto): Promise<{
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
    editUserRole(userId: string, dto: InviteUserDto): Promise<void>;
}
