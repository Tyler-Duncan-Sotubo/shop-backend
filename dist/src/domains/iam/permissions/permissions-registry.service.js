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
exports.PermissionsRegistryService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const permission_keys_1 = require("./permission-keys");
let PermissionsRegistryService = class PermissionsRegistryService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }
    async create() {
        return this.db.transaction(async (tx) => {
            const existingPermissions = await tx
                .select()
                .from(schema_1.permissions)
                .where((0, drizzle_orm_1.inArray)(schema_1.permissions.key, [...permission_keys_1.PermissionKeys]));
            const existingKeys = new Set(existingPermissions.map((p) => p.key));
            const newPermissions = permission_keys_1.PermissionKeys.filter((key) => !existingKeys.has(key)).map((key) => ({ key }));
            if (newPermissions.length > 0) {
                await tx.insert(schema_1.permissions).values(newPermissions);
            }
            await this.cache.del('permissions:all');
            return 'Permissions created or updated successfully';
        });
    }
    findAll() {
        const cacheKey = 'permissions:all';
        return this.cache.getOrSetCache(cacheKey, async () => {
            return this.db.select().from(schema_1.permissions).execute();
        });
    }
    async findOne(id) {
        const cacheKey = `permissions:${id}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            const rows = await this.db
                .select()
                .from(schema_1.permissions)
                .where((0, drizzle_orm_1.eq)(schema_1.permissions.id, id))
                .execute();
            if (rows.length === 0) {
                throw new common_1.NotFoundException('Permission not found');
            }
            return rows[0];
        });
    }
};
exports.PermissionsRegistryService = PermissionsRegistryService;
exports.PermissionsRegistryService = PermissionsRegistryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], PermissionsRegistryService);
//# sourceMappingURL=permissions-registry.service.js.map