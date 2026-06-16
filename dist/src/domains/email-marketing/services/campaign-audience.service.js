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
exports.CampaignAudienceService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
let CampaignAudienceService = class CampaignAudienceService {
    constructor(db) {
        this.db = db;
    }
    async resolve(companyId, storeId, audienceType) {
        const emailSet = new Set();
        if (audienceType === 'all' || audienceType === 'customers') {
            const rows = await this.db
                .select({ email: schema_1.customers.billingEmail })
                .from(schema_1.customers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customers.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.customers.isActive, true), (0, drizzle_orm_1.eq)(schema_1.customers.marketingOptIn, true), (0, drizzle_orm_1.isNotNull)(schema_1.customers.billingEmail)))
                .execute();
            for (const row of rows) {
                if (row.email)
                    emailSet.add(row.email.toLowerCase().trim());
            }
        }
        if (audienceType === 'all' || audienceType === 'subscribers') {
            const rows = await this.db
                .select({ email: schema_1.subscribers.email })
                .from(schema_1.subscribers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.subscribers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.subscribers.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.subscribers.status, 'subscribed')))
                .execute();
            for (const row of rows) {
                if (row.email)
                    emailSet.add(row.email.toLowerCase().trim());
            }
        }
        const emails = Array.from(emailSet);
        return { emails, count: emails.length };
    }
    async count(companyId, storeId, audienceType) {
        const { count } = await this.resolve(companyId, storeId, audienceType);
        return count;
    }
};
exports.CampaignAudienceService = CampaignAudienceService;
exports.CampaignAudienceService = CampaignAudienceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], CampaignAudienceService);
//# sourceMappingURL=campaign-audience.service.js.map