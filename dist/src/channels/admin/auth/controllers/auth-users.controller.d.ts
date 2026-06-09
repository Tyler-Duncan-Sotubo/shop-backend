import { InviteUserDto } from '../dto/invite-user.dto';
import { User } from "../../common/types/user.type";
import { UserService } from "../../../../domains/auth/services";
import { InvitationsService } from "../../../../domains/auth/services/invitations.service";
import { UserStoreAccessService } from "../../../../domains/auth/services/user-store-access.service";
import { SyncUserStoresDto } from '../dto/sync-user-stores.dto';
export declare class AuthUsersController {
    private readonly user;
    private readonly invitations;
    private readonly userStoreAccess;
    constructor(user: UserService, invitations: InvitationsService, userStoreAccess: UserStoreAccessService);
    invite(dto: InviteUserDto, user: User): Promise<{
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
        role: string;
        firstName: string | null;
        lastName: string | null;
        avatar: string | null;
        lastLogin: Date | null;
    }[]>;
    syncUserStores(user: User, userId: string, dto: SyncUserStoresDto): Promise<void>;
}
