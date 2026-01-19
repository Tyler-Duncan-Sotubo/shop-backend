// password-reset.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PasswordResetEmailService } from 'src/domains/notification/services/password-reset.service';
import { AuditService } from 'src/domains/audit/audit.service';
import {
  companyRoles,
  passwordResetTokens,
  users,
} from 'src/infrastructure/drizzle/schema';

@Injectable()
export class PasswordResetService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly passwordResetEmailService: PasswordResetEmailService,
    private configService: ConfigService,
    private jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async generatePasswordResetToken(email: string) {
    const token = this.jwtService.sign({
      email,
    });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const user = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: companyRoles.name,
      })
      .from(users)
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))

      .where(eq(users.email, email));

    if (!user || user.length === 0) {
      throw new BadRequestException('User does not exist.');
    }

    const inviteLink = `${this.configService.get(
      'CLIENT_URL',
    )}/auth/reset-password/${token}`;

    await this.passwordResetEmailService.sendPasswordResetEmail(
      email,
      user[0].firstName || 'User',
      inviteLink,
    );

    const existingToken = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user[0].id));

    if (existingToken.length > 0) {
      await this.db
        .update(passwordResetTokens)
        .set({
          token,
          expiresAt,
          isUsed: false,
        })
        .where(eq(passwordResetTokens.userId, user[0].id))
        .execute();
    } else {
      await this.db
        .insert(passwordResetTokens)
        .values({
          userId: user[0].id,
          token,
          expiresAt,
          isUsed: false,
        })
        .execute();
    }

    return token;
  }

  async resetPassword(
    token: string,
    password: string,
    ip: string,
  ): Promise<{ message: string }> {
    const existingToken = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));

    if (existingToken.length === 0) {
      throw new BadRequestException('Token is not valid.');
    }

    if (existingToken[0].isUsed) {
      throw new BadRequestException('Token has already been used.');
    }

    if (existingToken[0].expiresAt < new Date()) {
      throw new BadRequestException('Token has expired.');
    }

    const decoded = await this.jwtService.verify(token);
    const { email } = decoded;

    if (!email) {
      throw new BadRequestException('User does not exist.');
    }

    await this.db
      .update(users)
      .set({
        password: await bcrypt.hash(password, 10),
      })
      .where(eq(users.email, email))
      .execute();

    await this.db
      .update(passwordResetTokens)
      .set({ isUsed: true })
      .where(eq(passwordResetTokens.token, token))
      .execute();

    // Log Password Reset
    await this.auditService.logAction({
      action: 'Password Reset',
      entity: 'Authentication',
      userId: existingToken[0].userId,
      details: 'User password reset successfully',
      ipAddress: ip,
    });

    return {
      message: 'Password reset successful',
    };
  }

  async invitationPasswordReset(token: string, password: string) {
    const decoded = await this.jwtService.verify(token);
    const { email } = decoded;

    if (!email) {
      throw new BadRequestException('User does not exist.');
    }

    await this.db
      .update(users)
      .set({
        password: await bcrypt.hash(password, 10),
      })
      .where(eq(users.email, email))
      .execute();

    return {
      message: 'Password reset successful',
    };
  }
}
