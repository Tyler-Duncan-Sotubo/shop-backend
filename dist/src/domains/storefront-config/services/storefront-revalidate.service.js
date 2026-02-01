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
var StorefrontRevalidateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorefrontRevalidateService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
let StorefrontRevalidateService = StorefrontRevalidateService_1 = class StorefrontRevalidateService {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger(StorefrontRevalidateService_1.name);
        this.secret = process.env.NEXT_REVALIDATE_SECRET;
        this.wildcardBaseDomain = process.env.PLATFORM_WILDCARD_DOMAIN;
    }
    normalizeHost(h) {
        return h
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .split('/')[0]
            .split(':')[0];
    }
    buildWildcardHost(storeSlug) {
        if (!storeSlug || !this.wildcardBaseDomain)
            return '';
        return `${storeSlug}.${this.normalizeHost(this.wildcardBaseDomain)}`;
    }
    async revalidateStorefront(storeId) {
        if (!this.secret) {
            this.logger.warn('revalidateStorefront skipped: missing NEXT_REVALIDATE_SECRET');
            return;
        }
        const store = await this.db.query.stores.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.stores.id, storeId),
            columns: { id: true, slug: true },
        });
        const domains = await this.db.query.storeDomains.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.storeDomains.storeId, storeId),
            columns: { domain: true },
        });
        const customHost = (domains ?? []).map((d) => this.normalizeHost(d.domain)).find(Boolean) ??
            '';
        const wildcardHost = store?.slug ? this.buildWildcardHost(store.slug) : '';
        const targetHost = customHost || wildcardHost;
        if (!targetHost) {
            this.logger.warn(`revalidateStorefront skipped: no domain/slug for storeId=${storeId}`);
            return;
        }
        const allHosts = new Set();
        if (customHost)
            allHosts.add(customHost);
        if (wildcardHost)
            allHosts.add(wildcardHost);
        for (const d of domains ?? []) {
            const h = this.normalizeHost(d.domain);
            if (h)
                allHosts.add(h);
        }
        const body = {
            storeId,
            tags: ['storefront-config'],
            hosts: Array.from(allHosts),
        };
        const url = `https://${targetHost}/api/revalidate`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-revalidate-secret': this.secret,
                },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                this.logger.warn(`revalidateStorefront failed (${res.status}) ${text} url=${url}`);
                return;
            }
            this.logger.log(`revalidateStorefront OK storeId=${storeId} url=${url}`);
        }
        catch (e) {
            this.logger.warn(`revalidateStorefront error: ${e?.message ?? e} url=${url}`);
        }
    }
};
exports.StorefrontRevalidateService = StorefrontRevalidateService;
exports.StorefrontRevalidateService = StorefrontRevalidateService = StorefrontRevalidateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], StorefrontRevalidateService);
//# sourceMappingURL=storefront-revalidate.service.js.map