import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import {
  companyRolePermissions,
  companyRoles,
  permissions,
  users,
  companies,
} from 'src/infrastructure/drizzle/schema';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { PermissionKeys } from './permission-keys';
import { User } from 'src/channels/admin/common/types/user.type';
import { AuditService } from 'src/domains/audit/audit.service';
import { DefaultRolePermissions } from './roles';
import { CompanyRoleName } from 'src/infrastructure/drizzle/schema/enum.schema';

@Injectable()
export class PermissionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
  ) {}

  // -----------------------------
  // Global permissions
  // -----------------------------
  async create() {
    return this.db.transaction(async (tx) => {
      const existingPermissions = await tx
        .select()
        .from(permissions)
        .where(inArray(permissions.key, [...PermissionKeys]));

      const existingKeys = new Set(existingPermissions.map((p) => p.key));

      const newPermissions = PermissionKeys.filter(
        (key) => !existingKeys.has(key),
      ).map((key) => ({ key }));

      if (newPermissions.length > 0) {
        await tx.insert(permissions).values(newPermissions);
      }

      await this.cache.del('permissions:all');
      return 'Permissions created or updated successfully';
    });
  }

  findAll() {
    const cacheKey = 'permissions:all';
    return this.cache.getOrSetCache(cacheKey, async () => {
      return this.db.select().from(permissions).execute();
    });
  }

  async findOne(id: string) {
    const cacheKey = `permissions:${id}`;

    return this.cache.getOrSetCache(cacheKey, async () => {
      const rows = await this.db
        .select()
        .from(permissions)
        .where(eq(permissions.id, id))
        .execute();

      if (rows.length === 0) {
        throw new NotFoundException('Permission not found');
      }

      return rows[0];
    });
  }

  // -----------------------------
  // Roles
  // -----------------------------
  async createRole(companyId: string, name: CompanyRoleName) {
    const existingRole = await this.db
      .select()
      .from(companyRoles)
      .where(
        and(eq(companyRoles.companyId, companyId), eq(companyRoles.name, name)),
      )
      .execute();

    if (existingRole.length > 0) {
      throw new BadRequestException(
        `Role ${name} already exists for company ${companyId}`,
      );
    }

    const [role] = await this.db
      .insert(companyRoles)
      .values({ companyId, name })
      .returning()
      .execute();

    await this.cache.del(`company_roles:${companyId}`);
    await this.cache.del(`company_permissions_summary:${companyId}`);

    return role;
  }

  /**
   * Seed default roles for a new company.
   * Uses our canonical role set: owner, manager, staff, support.
   */
  async createDefaultRoles(companyId: string) {
    const defaultRoles = ['owner', 'manager', 'staff', 'support'] as const;

    const insertedRoles = await this.db
      .insert(companyRoles)
      .values(defaultRoles.map((name) => ({ companyId, name })))
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);
    return insertedRoles;
  }

  async getRolesByCompany(companyId: string) {
    return this.cache.getOrSetVersioned(companyId, ['roles'], async () => {
      return this.db
        .select({ id: companyRoles.id, name: companyRoles.name })
        .from(companyRoles)
        .where(eq(companyRoles.companyId, companyId))
        .execute();
    });
  }

  async updateRole(companyId: string, roleId: string, name: CompanyRoleName) {
    const role = await this.findRoleById(companyId, roleId);

    const [updatedRole] = await this.db
      .update(companyRoles)
      .set({ name })
      .where(eq(companyRoles.id, role.id))
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);
    return updatedRole;
  }

  private async findRoleById(companyId: string, roleId: string) {
    const role = await this.db.query.companyRoles.findFirst({
      where: and(
        eq(companyRoles.companyId, companyId),
        eq(companyRoles.id, roleId),
      ),
    });

    if (!role) {
      throw new NotFoundException(`Role not found for company ${companyId}`);
    }

    return role;
  }

  // -----------------------------
  // Role ↔ Permission mapping
  // -----------------------------
  async assignPermissionToRole(
    companyId: string,
    roleId: string,
    permissionId: string,
  ) {
    await this.findRoleById(companyId, roleId);
    await this.findOne(permissionId);

    const already = await this.db
      .select()
      .from(companyRolePermissions)
      .where(
        and(
          eq(companyRolePermissions.companyRoleId, roleId),
          eq(companyRolePermissions.permissionId, permissionId),
        ),
      )
      .execute();

    if (already.length > 0) {
      throw new BadRequestException(
        `Permission ${permissionId} is already assigned to role ${roleId}`,
      );
    }

    const [assignment] = await this.db
      .insert(companyRolePermissions)
      .values({
        companyRoleId: roleId,
        permissionId,
      })
      .returning()
      .execute();

    await this.cache.del(`company_roles:${companyId}`);
    await this.cache.del(`role_permissions:${roleId}`);
    await this.cache.del(`company_permissions_summary:${companyId}`);
    await this.cache.bumpCompanyVersion(companyId);

    return assignment;
  }

  public async seedDefaultPermissionsForCompany(
    companyId: string,
  ): Promise<void> {
    const roles = await this.getRolesByCompany(companyId);
    const existingRows = await this.db
      .select({
        roleId: companyRolePermissions.companyRoleId,
        permId: companyRolePermissions.permissionId,
      })
      .from(companyRolePermissions)
      .innerJoin(
        companyRoles,
        eq(companyRoles.id, companyRolePermissions.companyRoleId),
      )
      .where(eq(companyRoles.companyId, companyId))
      .execute();

    const alreadySet = new Set<string>();
    for (const r of existingRows) {
      alreadySet.add(`${r.roleId}|${r.permId}`);
    }

    const allPermissions = await this.findAll();

    const permKeyToId = new Map<string, string>(
      allPermissions.map((perm) => [perm.key, perm.id]),
    );

    const toInsert: Array<{ roleId: string; permissionId: string }> = [];

    for (const role of roles) {
      const permittedKeys = DefaultRolePermissions[role.name] || [];
      for (const permissionKey of permittedKeys) {
        const permId = permKeyToId.get(permissionKey);
        if (!permId) continue;

        const lookup = `${role.id}|${permId}`;
        if (alreadySet.has(lookup)) continue;

        toInsert.push({ roleId: role.id, permissionId: permId });
      }
    }

    if (toInsert.length === 0) {
      return;
    }

    const CHUNK = 1000;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      await this.db
        .insert(companyRolePermissions)
        .values(
          chunk.map(({ roleId, permissionId }) => ({
            companyRoleId: roleId,
            permissionId,
          })),
        )
        .onConflictDoNothing()
        .execute();
    }

    await this.cache.bumpCompanyVersion(companyId);
  }

  async syncAllCompanyPermissions() {
    const allCompanies = await this.db.select().from(companies).execute();

    for (const company of allCompanies) {
      await this.seedDefaultPermissionsForCompany(company.id);
      await this.cache.bumpCompanyVersion(company.id);
    }
  }

  // -----------------------------
  // Lookups
  // -----------------------------
  async getLoginPermissionsByRole(companyId: string, roleId: string) {
    // If you want to keep login gating, change the keys below
    const loginKeys = ['auth.login', 'dashboard.access'];

    return this.cache.getOrSetVersioned(
      companyId,
      ['role', roleId, 'login-gates'],
      async () => {
        return this.db
          .select({ key: permissions.key })
          .from(companyRolePermissions)
          .innerJoin(
            permissions,
            eq(companyRolePermissions.permissionId, permissions.id),
          )
          .where(
            and(
              eq(companyRolePermissions.companyRoleId, roleId),
              inArray(permissions.key, loginKeys),
            ),
          )
          .execute();
      },
    );
  }

  async getPermissionsByRole(companyId: string, roleId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['role', roleId, 'permissions'],
      async () => {
        return this.db
          .select({ key: permissions.key })
          .from(companyRolePermissions)
          .innerJoin(
            permissions,
            eq(companyRolePermissions.permissionId, permissions.id),
          )
          .where(eq(companyRolePermissions.companyRoleId, roleId))
          .execute();
      },
    );
  }

  async getPermissionsForUser(user: User) {
    const cacheKey = `user_permissions:${user.companyId}:${user.id}`;

    return this.cache.getOrSetCache(cacheKey, async () => {
      const dbUser = await this.db.query.users.findFirst({
        where: eq(users.id, user.id),
      });

      if (!dbUser) return [];

      return this.getPermissionsByRole(dbUser.companyId, dbUser.companyRoleId);
    });
  }

  async getPermissionKeysForUser(roleId: string): Promise<string[]> {
    const role = await this.db.query.companyRoles.findFirst({
      where: eq(companyRoles.id, roleId),
      columns: { id: true, companyId: true },
    });

    if (!role) return [];

    return this.cache.getOrSetVersioned(
      role.companyId,
      ['role', roleId, 'permission-keys'],
      async () => {
        const rows = await this.db
          .select({ permissionKey: permissions.key })
          .from(companyRolePermissions)
          .innerJoin(
            permissions,
            eq(companyRolePermissions.permissionId, permissions.id),
          )
          .where(eq(companyRolePermissions.companyRoleId, roleId))
          .execute();

        return rows.map((p) => p.permissionKey);
      },
    );
  }

  async getCompanyPermissionsSummary(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['permissions-summary'],
      async () => {
        const roles = await this.db
          .select({ id: companyRoles.id, name: companyRoles.name })
          .from(companyRoles)
          .where(eq(companyRoles.companyId, companyId))
          .execute();

        const allPerms = await this.db
          .select({ id: permissions.id, key: permissions.key })
          .from(permissions)
          .execute();

        const assigned = await this.db
          .select({
            roleId: companyRolePermissions.companyRoleId,
            permissionId: companyRolePermissions.permissionId,
          })
          .from(companyRolePermissions)
          .innerJoin(
            companyRoles,
            eq(companyRoles.id, companyRolePermissions.companyRoleId),
          )
          .where(eq(companyRoles.companyId, companyId))
          .execute();

        const rolePermissionsMap: Record<string, string[]> = {};
        for (const r of roles) rolePermissionsMap[r.id] = [];
        for (const a of assigned) {
          rolePermissionsMap[a.roleId]?.push(a.permissionId);
        }

        return {
          roles,
          permissions: allPerms,
          rolePermissions: rolePermissionsMap,
        };
      },
    );
  }

  async updateCompanyRolePermissions(
    rolePermissions: Record<string, string[]>,
    user: User,
    ip: string,
  ) {
    const roles = await this.getRolesByCompany(user.companyId);

    for (const role of roles) {
      const permissionIds = rolePermissions[role.id] || [];

      await this.db
        .delete(companyRolePermissions)
        .where(eq(companyRolePermissions.companyRoleId, role.id))
        .execute();

      if (permissionIds.length > 0) {
        await this.db
          .insert(companyRolePermissions)
          .values(
            permissionIds.map((permissionId) => ({
              companyRoleId: role.id,
              permissionId,
            })),
          )
          .execute();
      }

      await this.auditService.logAction({
        action: 'update',
        entity: 'permissions',
        entityId: role.id,
        userId: user.id,
        details: 'Updated permissions for role',
        ipAddress: ip,
        changes: {
          roleId: role.id,
          permissions: permissionIds,
          companyId: user.companyId,
          roleName: role.name,
        },
      });

      await this.cache.bumpCompanyVersion(user.companyId);
    }

    await this.cache.bumpCompanyVersion(user.companyId);
  }

  async getRoleById(roleId: string) {
    const role = await this.db.query.companyRoles.findFirst({
      where: eq(companyRoles.id, roleId),
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }
}
