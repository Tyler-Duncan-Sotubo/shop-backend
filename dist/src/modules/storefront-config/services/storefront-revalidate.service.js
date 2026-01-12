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
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
let StorefrontRevalidateService = StorefrontRevalidateService_1 = class StorefrontRevalidateService {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger(StorefrontRevalidateService_1.name);
        this.nextBaseUrl = process.env.NEXT_STOREFRONT_URL;
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
    async revalidateStorefront(storeId) {
        if (!this.nextBaseUrl || !this.secret) {
            this.logger.warn('revalidateStorefront skipped: missing NEXT_STOREFRONT_URL or NEXT_REVALIDATE_SECRET');
            return;
        }
        const store = await this.db.query.stores.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.stores.id, storeId),
            columns: {
                id: true,
                slug: true,
            },
        });
        const domains = await this.db.query.storeDomains.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.storeDomains.storeId, storeId),
            columns: {
                domain: true,
            },
        });
        const hosts = new Set();
        for (const d of domains ?? []) {
            const host = this.normalizeHost(d.domain);
            if (host)
                hosts.add(host);
        }
        if (store?.slug && this.wildcardBaseDomain) {
            hosts.add(`${store.slug}.${this.normalizeHost(this.wildcardBaseDomain)}`);
        }
        const body = {
            tags: ['storefront-config'],
            hosts: Array.from(hosts),
        };
        try {
            const res = await fetch(`${this.nextBaseUrl}/api/revalidate`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-revalidate-secret': this.secret,
                },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                this.logger.warn(`revalidateStorefront failed (${res.status}) ${text}`);
                return;
            }
            this.logger.log(`revalidateStorefront OK storeId=${storeId} hosts=${body.hosts.join(',') || '(none)'}`);
        }
        catch (e) {
            this.logger.warn(`revalidateStorefront error: ${e?.message ?? e}`);
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