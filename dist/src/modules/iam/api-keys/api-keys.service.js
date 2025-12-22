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
exports.ApiKeysService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const config_1 = require("@nestjs/config");
let ApiKeysService = class ApiKeysService {
    constructor(db, configService) {
        this.db = db;
        this.configService = configService;
    }
    get pepper() {
        const pepper = this.configService.get('API_KEY_PEPPER');
        if (!pepper) {
            throw new common_1.InternalServerErrorException('API_KEY_PEPPER is not set');
        }
        return pepper;
    }
    hash(raw) {
        return (0, crypto_1.createHmac)('sha256', this.pepper).update(raw).digest('hex');
    }
    generateKey(envPrefix = 'pk_live') {
        const keyId = (0, crypto_1.randomBytes)(4).toString('hex');
        const secret = (0, crypto_1.randomBytes)(24).toString('base64url');
        const prefix = `${envPrefix}_${keyId}`;
        const rawKey = `${prefix}_${secret}`;
        return { rawKey, prefix };
    }
    parsePrefix(rawKey) {
        const parts = rawKey.split('_');
        if (parts.length < 4)
            return null;
        return parts.slice(0, 3).join('_');
    }
    async createKey(companyId, dto) {
        const envPrefix = dto.prefix ?? 'pk_live';
        const { rawKey, prefix } = this.generateKey(envPrefix);
        const keyHash = this.hash(rawKey);
        const [row] = await this.db
            .insert(schema_1.apiKeys)
            .values({
            companyId,
            storeId: dto.storeId ?? null,
            name: dto.name,
            keyHash,
            prefix,
            scopes: dto.scopes ?? [],
            expiresAt: dto.expiresAt ?? null,
        })
            .returning()
            .execute();
        return { apiKey: row, rawKey };
    }
    async listCompanyKeys(companyId, storeId) {
        return this.db
            .select()
            .from(schema_1.apiKeys)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.apiKeys.companyId, companyId), storeId ? (0, drizzle_orm_1.eq)(schema_1.apiKeys.storeId, storeId) : undefined))
            .execute();
    }
    async revokeKey(companyId, keyId) {
        const [existing] = await this.db
            .select({ id: schema_1.apiKeys.id })
            .from(schema_1.apiKeys)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.apiKeys.id, keyId), (0, drizzle_orm_1.eq)(schema_1.apiKeys.companyId, companyId)))
            .execute();
        if (!existing)
            throw new common_1.NotFoundException('API key not found');
        await this.db
            .update(schema_1.apiKeys)
            .set({ isActive: false })
            .where((0, drizzle_orm_1.eq)(schema_1.apiKeys.id, keyId))
            .execute();
    }
    async verifyRawKey(rawKey) {
        if (!rawKey || typeof rawKey !== 'string')
            return null;
        const prefix = this.parsePrefix(rawKey);
        if (!prefix)
            return null;
        const [row] = await this.db
            .select()
            .from(schema_1.apiKeys)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.apiKeys.prefix, prefix), (0, drizzle_orm_1.eq)(schema_1.apiKeys.isActive, true)))
            .execute();
        if (!row)
            return null;
        if (row.expiresAt && row.expiresAt <= new Date())
            return null;
        const computed = this.hash(rawKey);
        if (row.keyHash !== computed)
            return null;
        await this.db
            .update(schema_1.apiKeys)
            .set({ lastUsedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.apiKeys.id, row.id))
            .execute();
        return row;
    }
    ensureScope(apiKey, requiredScopes) {
        if (!requiredScopes?.length)
            return;
        const keyScopes = apiKey.scopes ?? [];
        const hasAll = requiredScopes.every((s) => keyScopes.includes(s));
        if (!hasAll)
            throw new common_1.ForbiddenException('API key missing required scope(s)');
    }
};
exports.ApiKeysService = ApiKeysService;
exports.ApiKeysService = ApiKeysService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, config_1.ConfigService])
], ApiKeysService);
//# sourceMappingURL=api-keys.service.js.map