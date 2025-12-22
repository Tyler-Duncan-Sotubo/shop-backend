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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const api_keys_service_1 = require("../api-keys.service");
let ApiKeyGuard = class ApiKeyGuard {
    constructor(apiKeysService, reflector) {
        this.apiKeysService = apiKeysService;
        this.reflector = reflector;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const rawKey = req.headers['x-api-key'];
        if (!rawKey || typeof rawKey !== 'string') {
            throw new common_1.UnauthorizedException('Missing API key');
        }
        const apiKey = await this.apiKeysService.verifyRawKey(rawKey);
        if (!apiKey) {
            throw new common_1.UnauthorizedException('Invalid or expired API key');
        }
        const origin = req.headers.origin ||
            (req.headers.referer ? new URL(req.headers.referer).origin : null);
        if (apiKey.allowedOrigins?.length) {
            if (!origin || !apiKey.allowedOrigins.includes(origin)) {
                throw new common_1.ForbiddenException('Origin not allowed for this API key');
            }
        }
        const requiredScopes = this.reflector.get('apiScopes', context.getHandler()) ?? [];
        if (requiredScopes.length) {
            this.apiKeysService.ensureScope(apiKey, requiredScopes);
        }
        req.apiKey = {
            id: apiKey.id,
            scopes: apiKey.scopes ?? [],
            storeId: apiKey.storeId ?? null,
        };
        req.companyId = apiKey.companyId;
        if (apiKey.storeId) {
            req.storeId = apiKey.storeId;
        }
        return true;
    }
};
exports.ApiKeyGuard = ApiKeyGuard;
exports.ApiKeyGuard = ApiKeyGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [api_keys_service_1.ApiKeysService,
        core_1.Reflector])
], ApiKeyGuard);
//# sourceMappingURL=api-key.guard.js.map