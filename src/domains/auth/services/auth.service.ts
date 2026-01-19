// auth.service.ts
import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  companies,
  companyRoles,
  users,
} from 'src/infrastructure/drizzle/schema';
import { UserService } from './user.service';
import { TokenGeneratorService } from './token-generator.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { LoginVerificationService } from './login-verification.service';
import { PermissionsService } from '../../iam/permissions/permissions.service';
import { CompanySettingsService } from 'src/domains/company-settings/company-settings.service';
import { SessionsService } from './sessions.service';
import { JwtType, User } from 'src/channels/admin/common/types/user.type';
import { LoginInput, RefreshTokenInput } from '../inputs';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly userService: UserService,
    private readonly tokenGeneratorService: TokenGeneratorService,
    private readonly auditService: AuditService,
    private readonly verifyLogin: LoginVerificationService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly companySettingsService: CompanySettingsService,
    private readonly permissionsService: PermissionsService,
    private readonly session: SessionsService,
    private readonly logger: PinoLogger,
  ) {}

  // -----------------------------
  // Core login completion
  // -----------------------------
  private async completeLogin(user: any, ip: string) {
    // Update lastLogin
    await this.db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id))
      .execute();

    // Load full user + company + role info
    const [updatedUser] = await this.db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: companyRoles.name,
        companyId: users.companyId,
        avatar: users.avatar,
        roleId: users.companyRoleId,
        plan: companies.plan,
        trialEndsAt: companies.trialEndsAt,
        onboardingCompleted: users.onboardingCompleted,
      })
      .from(users)
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
      .innerJoin(companies, eq(users.companyId, companies.id))
      .where(eq(users.id, user.id))
      .execute();

    // Log login event
    await this.auditService.logAction({
      action: 'Login',
      entity: 'Authentication',
      userId: user.id,
      details: 'User logged in',
      ipAddress: ip,
    });

    // Generate tokens
    const { accessToken, refreshToken } =
      await this.tokenGeneratorService.generateToken(user);

    await this.session.createSession({
      userId: user.id,
      companyId: user.companyId,
      refreshToken,
      ipAddress: ip,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
    });

    // Fetch permission keys for this role
    const permissionKeys =
      await this.permissionsService.getPermissionKeysForUser(
        updatedUser.roleId,
      );

    // Plan / trial tags
    const now = Date.now();
    const MS_IN_DAY = 24 * 60 * 60 * 1000;

    const trialEndsAtMs = updatedUser.trialEndsAt
      ? new Date(updatedUser.trialEndsAt).getTime()
      : null;

    const trialDaysLeft = trialEndsAtMs
      ? Math.max(0, Math.ceil((trialEndsAtMs - now) / MS_IN_DAY))
      : null;

    const trialActive = !!trialEndsAtMs && trialEndsAtMs > now;

    const planTag = updatedUser.plan
      ? `plan.${updatedUser.plan}` // e.g. plan.free | plan.pro | plan.enterprise
      : 'plan.free';

    const tags = [
      planTag,
      trialActive ? 'trial.active' : 'trial.expired',
      ...(typeof trialDaysLeft === 'number'
        ? [`trial.days_left:${trialDaysLeft}`]
        : []),
    ];

    const permissions = Array.from(new Set([...permissionKeys, ...tags]));

    const onboardingCompleted = !!user.onboardingCompleted;

    return {
      user: updatedUser,
      backendTokens: {
        accessToken,
        refreshToken,
        expiresIn: Date.now() + 1000 * 60 * 10,
      },
      permissions, // includes plan.* and trial.* tags
      onboardingCompleted,
    };
  }

  // -----------------------------
  // Login (dashboard-only, no ESS)
  // -----------------------------
  async login(dto: LoginInput, ip: string) {
    const user = await this.validateUser(dto.email, dto.password);

    const [role] = await this.db
      .select({ name: companyRoles.name, id: companyRoles.id })
      .from(companyRoles)
      .where(eq(companyRoles.id, user.companyRoleId))
      .execute();

    if (!role) {
      this.logger.warn(
        { email: dto.email, ip },
        'Login rejected: role not found',
      );
      throw new BadRequestException('Invalid credentials');
    }

    // 2FA check
    const now = new Date();
    const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
    const hoursSinceLastLogin = lastLogin
      ? (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60)
      : Infinity;

    const companySettings =
      await this.companySettingsService.getTwoFactorAuthSetting(user.companyId);

    if (hoursSinceLastLogin > 48 && companySettings.twoFactorAuth) {
      await this.verifyLogin.generateVerificationToken(user.id);
      const tempToken =
        await this.tokenGeneratorService.generateTempToken(user);

      this.logger.info(
        { userId: user.id, email: dto.email, ip },
        '2FA required due to inactivity',
      );

      return {
        status: 'verification_required',
        requiresVerification: true,
        tempToken,
        message: 'Verification code sent',
      };
    }

    this.logger.info(
      { userId: user.id, email: dto.email, role: role.name, ip },
      'Login successful',
    );

    return this.completeLogin(user, ip);
  }

  // -----------------------------
  // 2FA verification
  // -----------------------------
  async verifyCode(tempToken: string, code: string, ip: string) {
    const payload = await this.jwtService.verifyAsync(tempToken, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .execute();

    if (!user || user.verificationCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    if (
      !user.verificationCodeExpiresAt ||
      user.verificationCodeExpiresAt < new Date()
    ) {
      throw new BadRequestException('Verification code expired');
    }

    // Clear verification fields
    await this.db
      .update(users)
      .set({
        verificationCode: null,
        verificationCodeExpiresAt: null,
      })
      .where(eq(users.id, user.id))
      .execute();

    return this.completeLogin(user, ip);
  }

  // -----------------------------
  // Refresh token
  // -----------------------------
  async refreshToken(user: JwtType, dto: RefreshTokenInput) {
    const payload = {
      email: user.email,
      sub: user.sub,
    };

    const { accessToken } =
      await this.tokenGeneratorService.generateToken(payload);

    await this.session.findValidSessionByToken(dto.token);

    return {
      accessToken,
      refreshToken: '',
      expiresIn: Date.now() + 1000 * 60 * 10,
    };
  }

  // -----------------------------
  // Validate user credentials
  // -----------------------------
  private async validateUser(email: string, password: string) {
    const user = await this.userService.findUserByEmail(email.toLowerCase());

    if (!user) {
      throw new NotFoundException('Invalid email or password');
    }

    const passwordIsValid = await bcrypt.compare(password, user.password);

    if (!passwordIsValid) {
      throw new BadRequestException('Invalid credentials');
    }

    return user;
  }

  // -----------------------------
  // Logout
  // -----------------------------
  async logout(user: User) {
    await this.session.revokeSession(user.id);
    return { message: 'Logged out successfully' };
  }
}
