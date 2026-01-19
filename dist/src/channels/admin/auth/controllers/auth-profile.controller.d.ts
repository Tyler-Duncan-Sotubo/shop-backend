import { UpdateProfileDto } from '../dto/update-profile.dto';
import { User } from 'src/channels/admin/common/types/user.type';
import { UserService } from 'src/domains/auth/services';
export declare class AuthProfileController {
    private readonly userService;
    constructor(userService: UserService);
    getUser(user: User): Promise<User>;
    updateProfile(user: User, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        avatar: string | null;
        companyId: string;
    }>;
    getUserProfile(user: User): Promise<{
        id: string;
        email: string;
        role: "owner" | "manager" | "staff" | "support";
        first_name: string | null;
        last_name: string | null;
        avatar: string | null;
    }>;
}
