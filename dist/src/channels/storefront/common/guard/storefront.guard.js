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
exports.StorefrontGuard = void 0;
const common_1 = require("@nestjs/common");
const stores_service_1 = require("../../../../domains/commerce/stores/stores.service");
let StorefrontGuard = class StorefrontGuard {
    constructor(storesService) {
        this.storesService = storesService;
    }
    getHost(req) {
        const host = req.headers['x-store-host'] ||
            req.headers['x-forwarded-host'] ||
            req.headers['host'] ||
            '';
        return String(host).toLowerCase().split(':')[0].trim();
    }
    getOrigin(req) {
        const origin = req.headers.origin;
        if (origin && typeof origin === 'string')
            return origin;
        const referer = req.headers.referer;
        if (referer && typeof referer === 'string') {
            try {
                return new URL(referer).origin;
            }
            catch {
                return null;
            }
        }
        return null;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const host = this.getHost(req);
        if (!host)
            throw new common_1.BadRequestException('Missing host');
        const resolved = await this.storesService.resolveStoreByHost(host);
        if (!resolved)
            throw new common_1.BadRequestException('Unknown store domain');
        req.storeId = resolved.storeId;
        req.companyId = resolved.companyId;
        req.storeDomain = resolved.domain ?? host;
        req.isPrimaryDomain = resolved.isPrimary ?? null;
        return true;
    }
};
exports.StorefrontGuard = StorefrontGuard;
exports.StorefrontGuard = StorefrontGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [stores_service_1.StoresService])
], StorefrontGuard);
//# sourceMappingURL=storefront.guard.js.map