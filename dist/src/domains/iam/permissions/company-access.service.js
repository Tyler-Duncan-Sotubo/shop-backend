"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyAccessService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
const roles_1 = require("./roles");
let CompanyAccessService = class CompanyAccessService {
    constructor(db, cache, auditService) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
    }
    async createRole(params) {
        const { companyId, name } = params;
        const existingRole = await this.db
            .select()
            .from(schema_1.companyRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.companyRoles.name, name)))
            .execute();
        if (existingRole.length > 0) {
            throw new common_1.BadRequestException(`Role ${name} already exists for company ${companyId}`);
        }
        const [role] = await this.db
            .insert(schema_1.companyRoles)
            .values({
            companyId,
            name: name,
            displayName: params.displayName,
            isSystem: params.isSystem,
        })
            .returning()
            .execute();
        await this.cache.del(`company_roles:${companyId}`);
        await this.cache.del(`company_permissions_summary:${companyId}`);
        await this.cache.bumpCompanyVersion(companyId);
        return role;
    }
    async createDefaultRoles(companyId) {
        const defaultRoles = ['owner', 'manager', 'staff', 'support'];
        const insertedRoles = await this.db
            .insert(schema_1.companyRoles)
            .values(defaultRoles.map((name) => ({ companyId, name: name })))
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        return insertedRoles;
    }
    async getRolesByCompany(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['roles'], async () => {
            return this.db
                .select({
                id: schema_1.companyRoles.id,
                name: schema_1.companyRoles.name,
                displayName: schema_1.companyRoles.displayName,
            })
                .from(schema_1.companyRoles)
                .where((0, drizzle_orm_1.eq)(schema_1.companyRoles.companyId, companyId))
                .execute();
        });
    }
    async updateRole(companyId, roleId, name) {
        const role = await this.findRoleById(companyId, roleId);
        const [updatedRole] = await this.db
            .update(schema_1.companyRoles)
            .set({ name: name })
            .where((0, drizzle_orm_1.eq)(schema_1.companyRoles.id, role.id))
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        return updatedRole;
    }
    async getRoleById(roleId) {
        const role = await this.db.query.companyRoles.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.companyRoles.id, roleId),
        });
        if (!role)
            throw new common_1.NotFoundException('Role not found');
        return role;
    }
    async findRoleById(companyId, roleId) {
        const role = await this.db.query.companyRoles.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.companyRoles.id, roleId)),
        });
        if (!role) {
            throw new common_1.NotFoundException(`Role not found for company ${companyId}`);
        }
        return role;
    }
    async assignPermissionToRole(companyId, roleId, permissionId) {
        await this.findRoleById(companyId, roleId);
        const perm = await this.db
            .select()
            .from(schema_1.permissions)
            .where((0, drizzle_orm_1.eq)(schema_1.permissions.id, permissionId))
            .execute();
        if (perm.length === 0)
            throw new common_1.NotFoundException('Permission not found');
        const already = await this.db
            .select()
            .from(schema_1.companyRolePermissions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.companyRoleId, roleId), (0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.permissionId, permissionId)))
            .execute();
        if (already.length > 0) {
            throw new common_1.BadRequestException(`Permission ${permissionId} is already assigned to role ${roleId}`);
        }
        const [assignment] = await this.db
            .insert(schema_1.companyRolePermissions)
            .values({ companyRoleId: roleId, permissionId })
            .returning()
            .execute();
        await this.cache.del(`company_roles:${companyId}`);
        await this.cache.del(`role_permissions:${roleId}`);
        await this.cache.del(`company_permissions_summary:${companyId}`);
        await this.cache.bumpCompanyVersion(companyId);
        return assignment;
    }
    async seedDefaultPermissionsForCompany(companyId) {
        const roles = await this.getRolesByCompany(companyId);
        const existingRows = await this.db
            .select({
            roleId: schema_1.companyRolePermissions.companyRoleId,
            permId: schema_1.companyRolePermissions.permissionId,
        })
            .from(schema_1.companyRolePermissions)
            .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.companyRoles.id, schema_1.companyRolePermissions.companyRoleId))
            .where((0, drizzle_orm_1.eq)(schema_1.companyRoles.companyId, companyId))
            .execute();
        const alreadySet = new Set();
        for (const r of existingRows)
            alreadySet.add(`${r.roleId}|${r.permId}`);
        const allPermissions = await this.db.select().from(schema_1.permissions).execute();
        const permKeyToId = new Map(allPermissions.map((p) => [p.key, p.id]));
        const toInsert = [];
        for (const role of roles) {
            const permittedKeys = roles_1.DefaultRolePermissions[role.name] || [];
            for (const permissionKey of permittedKeys) {
                const permId = permKeyToId.get(permissionKey);
                if (!permId)
                    continue;
                const lookup = `${role.id}|${permId}`;
                if (alreadySet.has(lookup))
                    continue;
                toInsert.push({ roleId: role.id, permissionId: permId });
            }
        }
        if (toInsert.length === 0)
            return;
        const CHUNK = 1000;
        for (let i = 0; i < toInsert.length; i += CHUNK) {
            const chunk = toInsert.slice(i, i + CHUNK);
            await this.db
                .insert(schema_1.companyRolePermissions)
                .values(chunk.map((x) => ({
                companyRoleId: x.roleId,
                permissionId: x.permissionId,
            })))
                .onConflictDoNothing()
                .execute();
        }
        await this.cache.bumpCompanyVersion(companyId);
    }
    async syncAllCompanyPermissions() {
        const allCompanies = await this.db.select().from(schema_1.companies).execute();
        for (const company of allCompanies) {
            await this.seedDefaultPermissionsForCompany(company.id);
            await this.cache.bumpCompanyVersion(company.id);
        }
    }
    async getLoginPermissionsByRole(companyId, roleId) {
        const loginKeys = ['auth.login', 'dashboard.access'];
        return this.cache.getOrSetVersioned(companyId, ['role', roleId, 'login-gates'], async () => {
            return this.db
                .select({ key: schema_1.permissions.key })
                .from(schema_1.companyRolePermissions)
                .innerJoin(schema_1.permissions, (0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.permissionId, schema_1.permissions.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.companyRoleId, roleId), (0, drizzle_orm_1.inArray)(schema_1.permissions.key, loginKeys)))
                .execute();
        });
    }
    async getPermissionsByRole(companyId, roleId) {
        return this.cache.getOrSetVersioned(companyId, ['role', roleId, 'permissions'], async () => {
            return this.db
                .select({ key: schema_1.permissions.key })
                .from(schema_1.companyRolePermissions)
                .innerJoin(schema_1.permissions, (0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.permissionId, schema_1.permissions.id))
                .where((0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.companyRoleId, roleId))
                .execute();
        });
    }
    async getPermissionsForUser(user) {
        const cacheKey = `user_permissions:${user.companyId}:${user.id}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            const dbUser = await this.db.query.users.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.users.id, user.id),
            });
            if (!dbUser)
                return [];
            return this.getPermissionsByRole(dbUser.companyId, dbUser.companyRoleId);
        });
    }
    async getPermissionKeysForUser(roleId) {
        const role = await this.db.query.companyRoles.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.companyRoles.id, roleId),
            columns: { id: true, companyId: true },
        });
        if (!role)
            return [];
        return this.cache.getOrSetVersioned(role.companyId, ['role', roleId, 'permission-keys'], async () => {
            const rows = await this.db
                .select({ permissionKey: schema_1.permissions.key })
                .from(schema_1.companyRolePermissions)
                .innerJoin(schema_1.permissions, (0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.permissionId, schema_1.permissions.id))
                .where((0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.companyRoleId, roleId))
                .execute();
            return rows.map((p) => p.permissionKey);
        });
    }
    async getCompanyPermissionsSummary(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['permissions-summary'], async () => {
            const roles = await this.db
                .select({
                id: schema_1.companyRoles.id,
                name: schema_1.companyRoles.name,
                displayName: schema_1.companyRoles.displayName,
            })
                .from(schema_1.companyRoles)
                .where((0, drizzle_orm_1.eq)(schema_1.companyRoles.companyId, companyId))
                .execute();
            const allPerms = await this.db
                .select({ id: schema_1.permissions.id, key: schema_1.permissions.key })
                .from(schema_1.permissions)
                .execute();
            const assigned = await this.db
                .select({
                roleId: schema_1.companyRolePermissions.companyRoleId,
                permissionId: schema_1.companyRolePermissions.permissionId,
            })
                .from(schema_1.companyRolePermissions)
                .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.companyRoles.id, schema_1.companyRolePermissions.companyRoleId))
                .where((0, drizzle_orm_1.eq)(schema_1.companyRoles.companyId, companyId))
                .execute();
            const rolePermissionsMap = {};
            for (const r of roles)
                rolePermissionsMap[r.id] = [];
            for (const a of assigned)
                rolePermissionsMap[a.roleId]?.push(a.permissionId);
            return {
                roles,
                permissions: allPerms,
                rolePermissions: rolePermissionsMap,
            };
        });
    }
    async updateCompanyRolePermissions(rolePermissions, user, ip) {
        const roles = await this.getRolesByCompany(user.companyId);
        for (const role of roles) {
            const permissionIds = rolePermissions[role.id] || [];
            await this.db
                .delete(schema_1.companyRolePermissions)
                .where((0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.companyRoleId, role.id))
                .execute();
            if (permissionIds.length > 0) {
                await this.db
                    .insert(schema_1.companyRolePermissions)
                    .values(permissionIds.map((permissionId) => ({
                    companyRoleId: role.id,
                    permissionId,
                })))
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
    async createCompanyRole(params) {
        const role = await this.createRole({
            companyId: params.companyId,
            name: `custom_${crypto.randomUUID()}`,
            displayName: params.displayName,
        });
        if (params.baseRoleId) {
            await this.cloneRolePermissions(params.baseRoleId, role.id);
        }
        await this.db
            .delete(schema_1.companyRolePermissions)
            .where((0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.companyRoleId, role.id))
            .execute();
        await this.db.insert(schema_1.companyRolePermissions).values(params.permissionIds.map((pid) => ({
            companyRoleId: role.id,
            permissionId: pid,
        })));
        return role;
    }
    async cloneRolePermissions(sourceRoleId, targetRoleId) {
        const rows = await this.db
            .select({ permissionId: schema_1.companyRolePermissions.permissionId })
            .from(schema_1.companyRolePermissions)
            .where((0, drizzle_orm_1.eq)(schema_1.companyRolePermissions.companyRoleId, sourceRoleId))
            .execute();
        if (rows.length === 0)
            return;
        await this.db
            .insert(schema_1.companyRolePermissions)
            .values(rows.map((r) => ({
            companyRoleId: targetRoleId,
            permissionId: r.permissionId,
        })))
            .onConflictDoNothing()
            .execute();
    }
};
exports.CompanyAccessService = CompanyAccessService;
exports.CompanyAccessService = CompanyAccessService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService])
], CompanyAccessService);
//# sourceMappingURL=company-access.service.js.map