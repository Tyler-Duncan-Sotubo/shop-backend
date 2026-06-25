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
import { User } from 'src/channels/admin/common/types/user.type';
import { UserStoreAccessService } from './user-store-access.service';

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly invitationService: InvitationService,
    private readonly permissionsService: PermissionsService,
    private readonly userStoreAccessService: UserStoreAccessService,
  ) {}

  /**
   * Invite a user to a company.
   * - Uses an existing role (preset or custom) by roleId.
   * - Email shows role.displayName (fallback to role.name).
   * - Token contains email + name + companyId + companyRoleId.
   */
  async inviteUser(dto: InviteUserInput, user: User) {
    const { companyId } = user;
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
    // Create invite token (includes name)
    // -----------------------------
    const token = this.jwtService.sign({
      email: dto.email.toLowerCase(),
      name: dto.name,
      companyId,
      companyRoleId: roleId,
      storeIds: dto.storeIds, // 👈 add
      invitedBy: user.id, // 👈 add (pass this into inviteUser from the controller's @CurrentUser())
    });

    const clientUrl = this.configService.get<string>('CLIENT_URL');
    if (!clientUrl) {
      throw new Error('CLIENT_URL is not configured');
    }

    const inviteLink = `${clientUrl}/invite/${token}`;

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
   * - Splits name into firstName and lastName.
   * - Creates user if not exists, else updates role + name for existing user.
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
    const storeIds: string[] = decoded?.storeIds ?? [];
    const invitedBy: string | null = decoded?.invitedBy ?? null;

    if (!email || !companyId || !companyRoleId) {
      throw new BadRequestException('Invalid invite token payload.');
    }

    // -----------------------------
    // Split name into firstName / lastName
    // -----------------------------
    const nameParts = String(decoded?.name ?? '')
      .trim()
      .split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') ?? '';

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

    // -----------------------------
    // Create or update user
    // -----------------------------
    const defaultPassword = await bcrypt.hash('ChangeMe123!', 10);

    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.companyId, companyId)))
      .limit(1)
      .execute();

    let userId: string;

    if (!existingUser) {
      const [newUser] = await this.db
        .insert(users)
        .values({
          email,
          password: defaultPassword,
          companyRoleId,
          companyId,
          firstName,
          lastName,
        })
        .returning({ id: users.id })
        .execute();

      userId = newUser.id;
    } else {
      await this.db
        .update(users)
        .set({ companyRoleId, firstName, lastName })
        .where(
          and(eq(users.id, existingUser.id), eq(users.companyId, companyId)),
        )
        .execute();

      userId = existingUser.id;
    }

    // -----------------------------
    // Grant store access
    // -----------------------------
    if (storeIds.length && invitedBy) {
      await this.userStoreAccessService.grantAccess(
        userId,
        storeIds,
        invitedBy,
      );
    }

    return { message: 'Invitation accepted', email };
  }
}
