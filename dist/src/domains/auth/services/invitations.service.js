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
exports.InvitationsService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const drizzle_orm_1 = require("drizzle-orm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const invitation_service_1 = require("../../notification/services/invitation.service");
const permissions_service_1 = require("../../iam/permissions/permissions.service");
let InvitationsService = class InvitationsService {
    constructor(db, jwtService, configService, invitationService, permissionsService) {
        this.db = db;
        this.jwtService = jwtService;
        this.configService = configService;
        this.invitationService = invitationService;
        this.permissionsService = permissionsService;
    }
    async inviteUser(dto, companyId) {
        const [company] = await this.db
            .select({ name: schema_1.companies.name })
            .from(schema_1.companies)
            .where((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId))
            .execute();
        if (!company) {
            throw new common_1.BadRequestException('Company not found.');
        }
        if (dto.companyRoleId && dto.createRole) {
            throw new common_1.BadRequestException('Choose an existing role OR create a new role, not both.');
        }
        if (dto.createRole &&
            (!dto.permissionIds || dto.permissionIds.length === 0)) {
            throw new common_1.BadRequestException('Permissions are required when creating a role.');
        }
        let roleId;
        if (dto.companyRoleId) {
            const role = await this.permissionsService.getRoleById(dto.companyRoleId);
            if (role.companyId !== companyId) {
                throw new common_1.BadRequestException('Invalid role for this company.');
            }
            roleId = role.id;
        }
        else if (dto.createRole) {
            const role = await this.permissionsService.createCompanyRole({
                companyId,
                displayName: dto.roleName ?? 'Custom Role',
                baseRoleId: dto.baseRoleId,
                permissionIds: dto.permissionIds,
            });
            roleId = role.id;
        }
        else {
            throw new common_1.BadRequestException('Either companyRoleId or createRole must be provided.');
        }
        const token = this.jwtService.sign({
            email: dto.email.toLowerCase(),
            companyId,
            companyRoleId: roleId,
        });
        const clientUrl = this.configService.get('CLIENT_URL');
        if (!clientUrl) {
            throw new Error('CLIENT_URL is not configured');
        }
        const inviteLink = `${clientUrl}/auth/invite/${token}`;
        const role = await this.permissionsService.getRoleById(roleId);
        const roleLabel = role.displayName ?? role.name;
        await this.invitationService.sendInvitationEmail(dto.email.toLowerCase(), dto.name, company.name, roleLabel, inviteLink);
        return { inviteLink };
    }
    async verifyInvite(token) {
        let decoded;
        try {
            decoded = await this.jwtService.verifyAsync(token);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired invite token');
        }
        const email = String(decoded?.email ?? '').toLowerCase();
        const companyId = String(decoded?.companyId ?? '');
        const companyRoleId = String(decoded?.companyRoleId ?? '');
        if (!email || !companyId || !companyRoleId) {
            throw new common_1.BadRequestException('Invalid invite token payload.');
        }
        const [role] = await this.db
            .select({ id: schema_1.companyRoles.id })
            .from(schema_1.companyRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyRoles.id, companyRoleId), (0, drizzle_orm_1.eq)(schema_1.companyRoles.companyId, companyId)))
            .execute();
        if (!role) {
            throw new common_1.BadRequestException('Invalid role for this company.');
        }
        const defaultPassword = await bcrypt.hash('ChangeMe123!', 10);
        const [existingUser] = await this.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.email, email), (0, drizzle_orm_1.eq)(schema_1.users.companyId, companyId)))
            .limit(1)
            .execute();
        if (!existingUser) {
            await this.db
                .insert(schema_1.users)
                .values({
                email,
                password: defaultPassword,
                companyRoleId,
                companyId,
            })
                .execute();
        }
        else {
            await this.db
                .update(schema_1.users)
                .set({ companyRoleId })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, existingUser.id), (0, drizzle_orm_1.eq)(schema_1.users.companyId, companyId)))
                .execute();
        }
        return { message: 'Invitation accepted', email };
    }
};
exports.InvitationsService = InvitationsService;
exports.InvitationsService = InvitationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, jwt_1.JwtService,
        config_1.ConfigService,
        invitation_service_1.InvitationService,
        permissions_service_1.PermissionsService])
], InvitationsService);
//# sourceMappingURL=invitations.service.js.map