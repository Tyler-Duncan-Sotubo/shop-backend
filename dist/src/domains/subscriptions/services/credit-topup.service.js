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
var CreditTopupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditTopupService = exports.CREDIT_BUNDLES = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const credits_service_1 = require("../../credits/credits.service");
const nanoid_1 = require("nanoid");
const billing_paystack_service_1 = require("./billing-paystack.service");
exports.CREDIT_BUNDLES = [
    { credits: 1000, amountNGN: 3000, label: '1,000 credits' },
    { credits: 5000, amountNGN: 12500, label: '5,000 credits' },
    { credits: 10000, amountNGN: 22000, label: '10,000 credits' },
    { credits: 25000, amountNGN: 50000, label: '25,000 credits' },
];
let CreditTopupService = CreditTopupService_1 = class CreditTopupService {
    constructor(db, credits, billingPaystack) {
        this.db = db;
        this.credits = credits;
        this.billingPaystack = billingPaystack;
        this.logger = new common_1.Logger(CreditTopupService_1.name);
    }
    getBundles() {
        return exports.CREDIT_BUNDLES;
    }
    async initiate(companyId, userEmail, credits) {
        const bundle = exports.CREDIT_BUNDLES.find((b) => b.credits === credits);
        if (!bundle) {
            throw new common_1.BadRequestException(`Invalid credit bundle. Available: ${exports.CREDIT_BUNDLES.map((b) => b.credits).join(', ')}`);
        }
        const reference = `TOPUP-${(0, nanoid_1.nanoid)(12).toUpperCase()}`;
        const [request] = await this.db
            .insert(schema_1.creditTopupRequests)
            .values({
            companyId,
            credits: bundle.credits,
            amountNGN: bundle.amountNGN,
            status: 'pending',
            paystackReference: reference,
            metadata: { label: bundle.label, initiatedBy: userEmail },
        })
            .returning()
            .execute();
        const result = await this.billingPaystack.initializeTransaction({
            email: userEmail,
            amountNGN: bundle.amountNGN,
            reference,
            callbackUrl: `${process.env.FRONTEND_URL}/marketing/credits?topup=success`,
            metadata: {
                companyId,
                credits: bundle.credits,
                type: 'credit_topup',
                requestId: request.id,
            },
        });
        await this.db
            .update(schema_1.creditTopupRequests)
            .set({ paystackAccessCode: result.data.accessCode })
            .where((0, drizzle_orm_1.eq)(schema_1.creditTopupRequests.id, request.id))
            .execute();
        this.logger.log(`[CreditTopup] Initiated ${bundle.credits} credits for company ${companyId} ref: ${reference}`);
        return {
            reference,
            authorizationUrl: result.data.authorizationUrl,
            accessCode: result.data.accessCode,
            credits: bundle.credits,
            amountNGN: bundle.amountNGN,
        };
    }
    async confirm(paystackReference) {
        const [request] = await this.db
            .select()
            .from(schema_1.creditTopupRequests)
            .where((0, drizzle_orm_1.eq)(schema_1.creditTopupRequests.paystackReference, paystackReference))
            .limit(1)
            .execute();
        if (!request) {
            throw new common_1.NotFoundException(`Topup request not found for reference: ${paystackReference}`);
        }
        if (request.status === 'paid') {
            this.logger.warn(`[CreditTopup] Already confirmed: ${paystackReference}`);
            return;
        }
        await this.db
            .update(schema_1.creditTopupRequests)
            .set({
            status: 'paid',
            paidAt: new Date(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.creditTopupRequests.id, request.id))
            .execute();
        await this.credits.topUp(request.companyId, request.credits, 'email', `Credit topup — ${request.credits} credits purchased`);
        await this.db
            .insert(schema_1.subscriptionInvoices)
            .values({
            companyId: request.companyId,
            topupRequestId: request.id,
            type: 'credit_topup',
            status: 'paid',
            amountNGN: request.amountNGN,
            paystackReference,
            paidAt: new Date(),
        })
            .execute();
        this.logger.log(`[CreditTopup] Confirmed ${request.credits} credits for company ${request.companyId} ref: ${paystackReference}`);
    }
    async verifyAndConfirm(companyId, paystackReference) {
        const result = await this.billingPaystack.verifyTransaction(paystackReference);
        if (!result.verified) {
            throw new common_1.BadRequestException(`Payment not verified. Status: ${result.status}`);
        }
        await this.confirm(paystackReference);
    }
    async getHistory(companyId) {
        return this.db
            .select()
            .from(schema_1.creditTopupRequests)
            .where((0, drizzle_orm_1.eq)(schema_1.creditTopupRequests.companyId, companyId))
            .orderBy(schema_1.creditTopupRequests.createdAt)
            .execute();
    }
    async getPending(companyId) {
        return this.db
            .select()
            .from(schema_1.creditTopupRequests)
            .where((0, drizzle_orm_1.eq)(schema_1.creditTopupRequests.companyId, companyId))
            .execute()
            .then((rows) => rows.filter((r) => r.status === 'pending'));
    }
};
exports.CreditTopupService = CreditTopupService;
exports.CreditTopupService = CreditTopupService = CreditTopupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, credits_service_1.CreditService,
        billing_paystack_service_1.BillingPaystackService])
], CreditTopupService);
//# sourceMappingURL=credit-topup.service.js.map