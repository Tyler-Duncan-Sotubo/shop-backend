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
exports.SessionsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const crypto = require("crypto");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
let SessionsService = class SessionsService {
    constructor(db) {
        this.db = db;
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    async createSession(params) {
        const hash = this.hashToken(params.refreshToken);
        const [row] = await this.db
            .insert(schema_1.sessions)
            .values({
            userId: params.userId,
            companyId: params.companyId,
            refreshTokenHash: hash,
            userAgent: params.userAgent,
            ipAddress: params.ipAddress,
            expiresAt: params.expiresAt,
        })
            .returning()
            .execute();
        return row;
    }
    async revokeSession(sessionId) {
        await this.db
            .update(schema_1.sessions)
            .set({ isRevoked: true })
            .where((0, drizzle_orm_1.eq)(schema_1.sessions.id, sessionId))
            .execute();
    }
    async revokeAllForUser(userId) {
        await this.db
            .update(schema_1.sessions)
            .set({ isRevoked: true })
            .where((0, drizzle_orm_1.eq)(schema_1.sessions.userId, userId))
            .execute();
    }
    async findValidSessionByToken(refreshToken, options) {
        const hash = this.hashToken(refreshToken);
        const where = options?.userId || options?.companyId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.sessions.refreshTokenHash, hash), ...(options.userId ? [(0, drizzle_orm_1.eq)(schema_1.sessions.userId, options.userId)] : []), ...(options.companyId
                ? [(0, drizzle_orm_1.eq)(schema_1.sessions.companyId, options.companyId)]
                : []))
            : (0, drizzle_orm_1.eq)(schema_1.sessions.refreshTokenHash, hash);
        const [row] = await this.db.select().from(schema_1.sessions).where(where).execute();
        if (!row)
            return null;
        if (row.isRevoked)
            return null;
        if (row.expiresAt <= new Date())
            return null;
        return row;
    }
    async touchSession(sessionId) {
        await this.db
            .update(schema_1.sessions)
            .set({ lastUsedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.sessions.id, sessionId))
            .execute();
    }
};
exports.SessionsService = SessionsService;
exports.SessionsService = SessionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], SessionsService);
//# sourceMappingURL=sessions.service.js.map