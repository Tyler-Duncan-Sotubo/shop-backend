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
exports.PaymentMethodsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const schema_1 = require("../../../../drizzle/schema");
const payment_methods_dto_1 = require("../dto/payment-methods.dto");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
let PaymentMethodsService = class PaymentMethodsService {
    constructor(db, companySettings) {
        this.db = db;
        this.companySettings = companySettings;
    }
    assertGatewayProvider(dto) {
        if (dto.method === payment_methods_dto_1.PaymentMethodType.gateway && !dto.provider) {
            throw new common_1.BadRequestException('provider is required when method=gateway');
        }
    }
    async listStoreMethods(companyId, storeId) {
        const [st] = await this.db
            .select({ id: schema_1.stores.id })
            .from(schema_1.stores)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stores.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.stores.id, storeId)))
            .execute();
        if (!st)
            throw new common_1.NotFoundException('Store not found');
        const rows = await this.db
            .select()
            .from(schema_1.paymentMethods)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.paymentMethods.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.paymentMethods.storeId, storeId)))
            .execute();
        return rows;
    }
    async getCheckoutMethods(companyId, storeId) {
        const rows = await this.listStoreMethods(companyId, storeId);
        const gateway = rows
            .filter((r) => r.method === 'gateway' && r.enabled)
            .map((r) => ({
            method: 'gateway',
            provider: r.provider,
            publicConfig: this.pickPublicGatewayConfig(r.provider, r.config),
        }));
        const bankTransfer = rows.find((r) => r.method === 'bank_transfer');
        return {
            storeId,
            methods: [
                ...gateway,
                ...(bankTransfer?.isEnabled
                    ? [
                        {
                            method: 'bank_transfer',
                            bankDetails: bankTransfer.config?.bankDetails ?? null,
                        },
                    ]
                    : []),
            ],
        };
    }
    pickPublicGatewayConfig(provider, config) {
        if (!config)
            return null;
        if (provider === 'paystack') {
            return {
                publicKey: config.publicKey ?? null,
                channels: config.channels ?? null,
            };
        }
        if (provider === 'stripe') {
            return {
                publishableKey: config.publishableKey ?? null,
            };
        }
        return null;
    }
    async toggle(companyId, dto) {
        this.assertGatewayProvider(dto);
        const provider = dto.method === payment_methods_dto_1.PaymentMethodType.gateway ? dto.provider : null;
        const existing = await this.db
            .select()
            .from(schema_1.paymentMethods)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.paymentMethods.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.paymentMethods.storeId, dto.storeId), (0, drizzle_orm_1.eq)(schema_1.paymentMethods.method, dto.method), provider
            ? (0, drizzle_orm_1.eq)(schema_1.paymentMethods.provider, provider)
            : (0, drizzle_orm_1.sql) `${schema_1.paymentMethods.provider} IS NULL`))
            .limit(1)
            .execute();
        if (existing?.[0]) {
            const [updated] = await this.db
                .update(schema_1.paymentMethods)
                .set({
                isEnabled: dto.enabled,
                status: dto.enabled === true ? 'connected' : 'disconnected',
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.paymentMethods.id, existing[0].id))
                .returning()
                .execute();
            return updated;
        }
        const [created] = await this.db
            .insert(schema_1.paymentMethods)
            .values({
            companyId,
            storeId: dto.storeId,
            method: dto.method,
            provider: provider,
            isEnabled: dto.enabled,
            status: dto.enabled === true ? 'connected' : 'disconnected',
            config: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
            .returning()
            .execute();
        return created;
    }
    async upsertGateway(companyId, dto) {
        const method = payment_methods_dto_1.PaymentMethodType.gateway;
        const rows = await this.db
            .select()
            .from(schema_1.paymentMethods)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.paymentMethods.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.paymentMethods.storeId, dto.storeId), (0, drizzle_orm_1.eq)(schema_1.paymentMethods.method, method), (0, drizzle_orm_1.eq)(schema_1.paymentMethods.provider, dto.provider)))
            .limit(1)
            .execute();
        const existing = rows?.[0] ?? null;
        const nextConfig = dto.config ?? existing?.config ?? null;
        if (existing) {
            const [updated] = await this.db
                .update(schema_1.paymentMethods)
                .set({
                isEnabled: dto.enabled,
                status: dto.enabled === true ? 'connected' : 'disconnected',
                config: nextConfig,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.paymentMethods.id, existing.id))
                .returning()
                .execute();
            return updated;
        }
        const [created] = await this.db
            .insert(schema_1.paymentMethods)
            .values({
            companyId,
            storeId: dto.storeId,
            method: method,
            provider: dto.provider,
            isEnabled: dto.enabled,
            config: nextConfig,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
            .returning()
            .execute();
        await this.companySettings.markOnboardingStep(companyId, 'payment_setup_complete', true);
        return created;
    }
    async upsertBankTransfer(companyId, dto) {
        const method = payment_methods_dto_1.PaymentMethodType.bank_transfer;
        const rows = await this.db
            .select()
            .from(schema_1.paymentMethods)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.paymentMethods.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.paymentMethods.storeId, dto.storeId), (0, drizzle_orm_1.eq)(schema_1.paymentMethods.method, method), (0, drizzle_orm_1.sql) `${schema_1.paymentMethods.provider} IS NULL`))
            .limit(1)
            .execute();
        const existing = rows?.[0] ?? null;
        const nextConfig = {
            bankDetails: dto.bankDetails,
        };
        if (existing) {
            const [updated] = await this.db
                .update(schema_1.paymentMethods)
                .set({
                isEnabled: dto.enabled,
                config: nextConfig,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.paymentMethods.id, existing.id))
                .returning()
                .execute();
            return updated;
        }
        const [created] = await this.db
            .insert(schema_1.paymentMethods)
            .values({
            companyId,
            storeId: dto.storeId,
            method: method,
            provider: null,
            enabled: dto.enabled,
            config: nextConfig,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
            .returning()
            .execute();
        await this.companySettings.markOnboardingStep(companyId, 'payment_setup_complete', true);
        return created;
    }
};
exports.PaymentMethodsService = PaymentMethodsService;
exports.PaymentMethodsService = PaymentMethodsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, company_settings_service_1.CompanySettingsService])
], PaymentMethodsService);
//# sourceMappingURL=payment-methods.service.js.map