// invitations.service.ts
import {
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  companies,
  users,
  companyRoles,
} from 'src/infrastructure/drizzle/schema';
import { InvitationService } from 'src/domains/notification/services/invitation.service';
import { PermissionsService } from 'src/domains/iam/permissions/permissions.service';
import { InviteUserInput } from '../inputs';

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly invitationService: InvitationService,
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * Invite a user to a company.
   * - Uses an existing role (preset or custom) by roleId.
   * - Email shows role.displayName (fallback to role.name).
   * - Token contains email + companyId + companyRoleId.
   */
  async inviteUser(dto: InviteUserInput, companyId: string) {
    const [company] = await this.db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, companyId))
      .execute();

    if (!company) {
      throw new BadRequestException('Company not found.');
    }

    // -----------------------------
    // Validate intent
    // -----------------------------
    if (dto.companyRoleId && dto.createRole) {
      throw new BadRequestException(
        'Choose an existing role OR create a new role, not both.',
      );
    }

    if (
      dto.createRole &&
      (!dto.permissionIds || dto.permissionIds.length === 0)
    ) {
      throw new BadRequestException(
        'Permissions are required when creating a role.',
      );
    }

    let roleId: string;

    // -----------------------------
    // Case 1: Assign existing role
    // -----------------------------
    if (dto.companyRoleId) {
      const role = await this.permissionsService.getRoleById(dto.companyRoleId);

      if (role.companyId !== companyId) {
        throw new BadRequestException('Invalid role for this company.');
      }

      roleId = role.id;
    }

    // -----------------------------
    // Case 2: Create role during invite
    // -----------------------------
    else if (dto.createRole) {
      const role = await this.permissionsService.createCompanyRole({
        companyId,
        displayName: dto.roleName ?? 'Custom Role',
        baseRoleId: dto.baseRoleId,
        permissionIds: dto.permissionIds!,
      });

      roleId = role.id;
    }

    // -----------------------------
    // Invalid payload
    // -----------------------------
    else {
      throw new BadRequestException(
        'Either companyRoleId or createRole must be provided.',
      );
    }

    // -----------------------------
    // Create invite token
    // -----------------------------
    const token = this.jwtService.sign({
      email: dto.email.toLowerCase(),
      companyId,
      companyRoleId: roleId,
    });

    const clientUrl = this.configService.get<string>('CLIENT_URL');
    if (!clientUrl) {
      throw new Error('CLIENT_URL is not configured');
    }

    const inviteLink = `${clientUrl}/auth/invite/${token}`;

    const role = await this.permissionsService.getRoleById(roleId);
    const roleLabel = role.displayName ?? role.name;

    await this.invitationService.sendInvitationEmail(
      dto.email.toLowerCase(),
      dto.name,
      company.name,
      roleLabel,
      inviteLink,
    );

    return { inviteLink };
  }

  /**
   * Verify invite token and attach user to company + role.
   * - Validates role belongs to company.
   * - Creates user if not exists, else updates role for existing user in company.
   */
  async verifyInvite(token: string) {
    let decoded: any;
    try {
      decoded = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired invite token');
    }

    const email = String(decoded?.email ?? '').toLowerCase();
    const companyId = String(decoded?.companyId ?? '');
    const companyRoleId = String(decoded?.companyRoleId ?? '');

    if (!email || !companyId || !companyRoleId) {
      throw new BadRequestException('Invalid invite token payload.');
    }

    // Validate role exists AND belongs to this company
    const [role] = await this.db
      .select({ id: companyRoles.id })
      .from(companyRoles)
      .where(
        and(
          eq(companyRoles.id, companyRoleId),
          eq(companyRoles.companyId, companyId),
        ),
      )
      .execute();

    if (!role) {
      throw new BadRequestException('Invalid role for this company.');
    }

    // Create or update user
    const defaultPassword = await bcrypt.hash('ChangeMe123!', 10);

    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.companyId, companyId)))
      .limit(1)
      .execute();

    if (!existingUser) {
      await this.db
        .insert(users)
        .values({
          email,
          password: defaultPassword,
          companyRoleId,
          companyId,
        })
        .execute();
    } else {
      await this.db
        .update(users)
        .set({ companyRoleId })
        .where(
          and(eq(users.id, existingUser.id), eq(users.companyId, companyId)),
        )
        .execute();
    }

    return { message: 'Invitation accepted', email };
  }
}
