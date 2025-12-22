import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { db } from 'src/drizzle/types/drizzle';
import { InviteUserDto } from '../dto/invite-user.dto';
import { InvitationService } from 'src/modules/notification/services/invitation.service';
import { PermissionsService } from 'src/modules/iam/permissions/permissions.service';
export declare class InvitationsService {
    private readonly db;
    private readonly jwtService;
    private readonly configService;
    private readonly invitationService;
    private readonly permissionsService;
    constructor(db: db, jwtService: JwtService, configService: ConfigService, invitationService: InvitationService, permissionsService: PermissionsService);
    inviteUser(dto: InviteUserDto, companyId: string): Promise<{
        token: string;
        companyName: string;
        inviteLink: string;
    }>;
    verifyInvite(token: string): Promise<{
        message: string;
        email: string;
    }>;
}
