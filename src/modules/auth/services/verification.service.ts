// verification.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { users, verificationTokens } from 'src/drizzle/schema';
import { db } from 'src/drizzle/types/drizzle';
import { EmailVerificationService } from 'src/modules/notification/services/email-verification.service';
import { TokenDto } from '../dto/token.dto';

@Injectable()
export class VerificationService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  async generateVerificationToken(
    userId: string,
    companyName?: string,
  ): Promise<string> {
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const user = await this.db.select().from(users).where(eq(users.id, userId));

    if (user.length === 0) {
      throw new BadRequestException('User not found.');
    }

    const existingToken = await this.db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.userId, userId));

    if (existingToken.length > 0) {
      await this.db
        .update(verificationTokens)
        .set({ token, expiresAt, isUsed: false })
        .where(eq(verificationTokens.userId, userId))
        .execute();
    } else {
      await this.db
        .insert(verificationTokens)
        .values({
          userId: userId,
          token,
          expiresAt,
          isUsed: false,
        })
        .execute();
    }

    await this.emailVerificationService.sendVerifyEmail(
      user[0].email,
      token,
      companyName,
    );

    return token;
  }

  async verifyToken(dto: TokenDto): Promise<object> {
    const existingToken = await this.db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.token, dto.token));

    if (existingToken.length === 0) {
      throw new BadRequestException('Token is not valid.');
    }

    if (existingToken[0].isUsed) {
      throw new BadRequestException('Token has already been used.');
    }

    if (existingToken[0].expiresAt < new Date()) {
      throw new BadRequestException('Token has expired.');
    }

    await this.db
      .update(users)
      .set({ isVerified: true })
      .where(eq(users.id, existingToken[0].userId))
      .execute();

    await this.db
      .update(verificationTokens)
      .set({ isUsed: true })
      .where(eq(verificationTokens.id, existingToken[0].id))
      .execute();

    return {
      success: true,
    };
  }
}
