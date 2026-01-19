import { InviteUserDto } from '../dto/invite-user.dto';
import { User } from 'src/channels/admin/common/types/user.type';
import { UserService } from 'src/domains/auth/services';
import { InvitationsService } from 'src/domains/auth/services/invitations.service';
export declare class AuthUsersController {
    private readonly user;
    private readonly invitations;
    constructor(user: UserService, invitations: InvitationsService);
    invite(dto: InviteUserDto, user: User): Promise<{
        token: string;
        companyName: string;
        inviteLink: string;
    }>;
    acceptInvite(token: string): Promise<{
        message: string;
        email: string;
    }>;
    editUserRole(dto: InviteUserDto, id: string): Promise<void>;
    getCompanyUsers(user: User): Promise<{
        id: string;
        email: string;
        role: "owner" | "manager" | "staff" | "support";
        firstName: string | null;
        lastName: string | null;
        avatar: string | null;
        lastLogin: Date | null;
    }[]>;
}
