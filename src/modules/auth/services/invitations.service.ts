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
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { companies, users, companyRoles } from 'src/drizzle/schema';
import { InviteUserDto } from '../dto/invite-user.dto';
import { InvitationService } from 'src/modules/notification/services/invitation.service';
import { PermissionsService } from 'src/modules/iam/permissions/permissions.service';

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly invitationService: InvitationService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async inviteUser(dto: InviteUserDto, companyId: string) {
    const [company] = await this.db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, companyId))
      .execute();

    if (!company) {
      throw new BadRequestException('Company not found.');
    }

    const token = this.jwtService.sign({
      email: dto.email,
      companyRoleId: dto.companyRoleId,
      companyId,
    });

    const clientUrl = this.configService.get<string>('CLIENT_URL');
    if (!clientUrl) {
      throw new Error('CLIENT_URL is not configured');
    }

    // get companies role
    const role = await this.permissionsService.getRoleById(dto.companyRoleId);

    const inviteLink = `${clientUrl}/auth/invite/${token}`;

    await this.invitationService.sendInvitationEmail(
      dto.email,
      dto.name,
      company.name,
      role.name,
      inviteLink,
    );

    return {
      token,
      companyName: company.name,
      inviteLink,
    };
  }

  async verifyInvite(token: string) {
    let decoded: any;
    try {
      decoded = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired invite token');
    }

    const { email, companyId, companyRoleId } = decoded;

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

    const defaultPassword = await bcrypt.hash('ChangeMe123!', 10);

    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)
      .execute();

    let user = existingUser;

    if (!user) {
      const [newUser] = await this.db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          password: defaultPassword,
          companyRoleId,
          companyId,
        })
        .returning()
        .execute();
      user = newUser;
    } else {
      await this.db
        .update(users)
        .set({ companyRoleId })
        .where(
          and(
            eq(users.email, email.toLowerCase()),
            eq(users.companyId, companyId),
          ),
        )
        .execute();
    }

    if (!user) {
      throw new BadRequestException('User creation or retrieval failed.');
    }

    return { message: 'Invitation accepted', email: user.email };
  }
}
