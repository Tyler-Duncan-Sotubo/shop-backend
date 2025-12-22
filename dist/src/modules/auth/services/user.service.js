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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const aws_service_1 = require("../../../common/aws/aws.service");
const cache_service_1 = require("../../../common/cache/cache.service");
let UserService = class UserService {
    constructor(db, awsService, cacheService) {
        this.db = db;
        this.awsService = awsService;
        this.cacheService = cacheService;
    }
    async findUserByEmail(email) {
        const [user] = await this.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, email.toLowerCase()))
            .limit(1)
            .execute();
        return user;
    }
    async getUserProfile(userId) {
        const [user] = await this.db
            .select({
            id: schema_1.users.id,
            email: schema_1.users.email,
            role: schema_1.companyRoles.name,
            first_name: schema_1.users.firstName,
            last_name: schema_1.users.lastName,
            avatar: schema_1.users.avatar,
        })
            .from(schema_1.users)
            .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.users.companyRoleId, schema_1.companyRoles.id))
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .execute();
        if (!user) {
            throw new common_1.BadRequestException('User not found.');
        }
        return user;
    }
    async updateUserProfile(userId, dto) {
        let avatarUrl;
        if (dto.avatar) {
            avatarUrl = await this.awsService.uploadImageToS3(dto.email, 'avatar', dto.avatar);
        }
        const [userRow] = await this.db
            .update(schema_1.users)
            .set({
            firstName: dto.first_name,
            lastName: dto.last_name,
            ...(avatarUrl ? { avatar: avatarUrl } : {}),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .returning({
            id: schema_1.users.id,
            email: schema_1.users.email,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            avatar: schema_1.users.avatar,
            companyId: schema_1.users.companyId,
        })
            .execute();
        if (!userRow) {
            throw new common_1.BadRequestException('User not found or update failed.');
        }
        await this.cacheService.bumpCompanyVersion(userRow.companyId);
        return userRow;
    }
    async companyUsers(companyId) {
        const allUsers = await this.db
            .select({
            id: schema_1.users.id,
            email: schema_1.users.email,
            role: schema_1.companyRoles.name,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            avatar: schema_1.users.avatar,
            lastLogin: schema_1.users.lastLogin,
        })
            .from(schema_1.users)
            .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.users.companyRoleId, schema_1.companyRoles.id))
            .where((0, drizzle_orm_1.eq)(schema_1.users.companyId, companyId))
            .execute();
        if (allUsers.length === 0) {
            throw new common_1.BadRequestException('No users found for this company.');
        }
        return allUsers;
    }
    async editUserRole(userId, dto) {
        await this.db
            .update(schema_1.users)
            .set({
            companyRoleId: dto.companyRoleId,
            ...(dto.name ? { firstName: dto.name } : {}),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .execute();
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, aws_service_1.AwsService,
        cache_service_1.CacheService])
], UserService);
//# sourceMappingURL=user.service.js.map