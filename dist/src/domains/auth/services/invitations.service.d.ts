import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { InvitationService } from "../../notification/services/invitation.service";
import { PermissionsService } from "../../iam/permissions/permissions.service";
import { InviteUserInput } from '../inputs';
import { User } from "../../../channels/admin/common/types/user.type";
import { UserStoreAccessService } from './user-store-access.service';
export declare class InvitationsService {
    private readonly db;
    private readonly jwtService;
    private readonly configService;
    private readonly invitationService;
    private readonly permissionsService;
    private readonly userStoreAccessService;
    constructor(db: db, jwtService: JwtService, configService: ConfigService, invitationService: InvitationService, permissionsService: PermissionsService, userStoreAccessService: UserStoreAccessService);
    inviteUser(dto: InviteUserInput, user: User): Promise<{
        inviteLink: string;
    }>;
    verifyInvite(token: string): Promise<{
        message: string;
        email: string;
    }>;
}
