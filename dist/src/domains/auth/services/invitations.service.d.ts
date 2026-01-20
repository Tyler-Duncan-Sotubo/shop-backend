import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { InvitationService } from 'src/domains/notification/services/invitation.service';
import { PermissionsService } from 'src/domains/iam/permissions/permissions.service';
import { InviteUserInput } from '../inputs';
export declare class InvitationsService {
    private readonly db;
    private readonly jwtService;
    private readonly configService;
    private readonly invitationService;
    private readonly permissionsService;
    constructor(db: db, jwtService: JwtService, configService: ConfigService, invitationService: InvitationService, permissionsService: PermissionsService);
    inviteUser(dto: InviteUserInput, companyId: string): Promise<{
        inviteLink: string;
    }>;
    verifyInvite(token: string): Promise<{
        message: string;
        email: string;
    }>;
}
