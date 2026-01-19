// src/modules/auth/user.service.ts
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { users, companyRoles } from 'src/infrastructure/drizzle/schema';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { InviteUserInput, UpdateProfileInput } from '../inputs';

@Injectable()
export class UserService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly awsService: AwsService,
    private readonly cacheService: CacheService,
  ) {}

  async findUserByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)
      .execute();

    return user;
  }

  async getUserProfile(userId: string) {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        role: companyRoles.name,
        first_name: users.firstName,
        last_name: users.lastName,
        avatar: users.avatar,
      })
      .from(users)
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
      .where(eq(users.id, userId))
      .execute();

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    return user;
  }

  async updateUserProfile(userId: string, dto: UpdateProfileInput) {
    let avatarUrl: string | undefined;

    if (dto.avatar) {
      avatarUrl = await this.awsService.uploadImageToS3(
        dto.email ?? userId,
        'avatar',
        dto.avatar,
      );
    }

    const [userRow] = await this.db
      .update(users)
      .set({
        firstName: dto.first_name || undefined,
        lastName: dto.last_name || undefined,
        ...(avatarUrl ? { avatar: avatarUrl } : {}),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatar,
        companyId: users.companyId,
      })
      .execute();

    if (!userRow) {
      throw new BadRequestException('User not found or update failed.');
    }

    await this.cacheService.bumpCompanyVersion(userRow.companyId);

    return userRow;
  }

  // Optional: admin-ish, but still “user related”.
  async companyUsers(companyId: string) {
    const allUsers = await this.db
      .select({
        id: users.id,
        email: users.email,
        role: companyRoles.name,
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatar,
        lastLogin: users.lastLogin,
      })
      .from(users)
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
      .where(eq(users.companyId, companyId))
      .execute();

    if (allUsers.length === 0) {
      throw new BadRequestException('No users found for this company.');
    }

    return allUsers;
  }

  async editUserRole(userId: string, dto: InviteUserInput) {
    await this.db
      .update(users)
      .set({
        companyRoleId: dto.companyRoleId,
        ...(dto.name ? { firstName: dto.name } : {}),
      })
      .where(eq(users.id, userId))
      .execute();
  }
}
