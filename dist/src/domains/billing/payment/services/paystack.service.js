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
exports.PaystackService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const drizzle_orm_1 = require("drizzle-orm");
const crypto = require("crypto");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const orders_service_1 = require("../../../commerce/orders/orders.service");
const payment_service_1 = require("./payment.service");
let PaystackService = class PaystackService {
    constructor(db, http, order, payment) {
        this.db = db;
        this.http = http;
        this.order = order;
        this.payment = payment;
        this.baseUrl = 'https://api.paystack.co';
    }
    async getStorePaystackMethod(companyId, storeId) {
        const rows = await this.db
            .select()
            .from(schema_1.paymentMethods)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.paymentMethods.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.paymentMethods.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.paymentMethods.method, 'gateway'), (0, drizzle_orm_1.eq)(schema_1.paymentMethods.provider, 'paystack')))
            .limit(1)
            .execute();
        const row = rows?.[0];
        if (!row) {
            throw new common_1.NotFoundException('Paystack is not configured for this store');
        }
        if (!row.isEnabled) {
            throw new common_1.BadRequestException('Paystack is disabled for this store');
        }
        return row;
    }
    async getSecretKey(companyId, storeId) {
        const method = await this.getStorePaystackMethod(companyId, storeId);
        const config = (method.config ?? {});
        if (!config.secretKey) {
            throw new common_1.BadRequestException('Paystack secret key is missing for this store');
        }
        return {
            method,
            config,
            secretKey: config.secretKey,
        };
    }
    toSubunit(amount) {
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than 0');
        }
        return Math.round(amount * 100);
    }
    async getPublicCheckoutConfig(companyId, storeId) {
        const method = await this.getStorePaystackMethod(companyId, storeId);
        const config = (method.config ?? {});
        return {
            provider: 'paystack',
            publicKey: config.publicKey ?? null,
            channels: config.channels ?? null,
            callbackUrl: config.callbackUrl ?? null,
        };
    }
    async initializeTransaction(input) {
        const { config, secretKey } = await this.getSecretKey(input.companyId, input.storeId);
        const payload = {
            email: input.email,
            amount: this.toSubunit(input.amount),
            currency: input.currency ?? 'NGN',
            reference: input.reference,
            callback_url: input.callbackUrl ?? config.callbackUrl ?? undefined,
            metadata: input.metadata ?? undefined,
            channels: input.channels ?? config.channels ?? undefined,
        };
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.post(`${this.baseUrl}/transaction/initialize`, payload, {
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    'Content-Type': 'application/json',
                },
            }));
            const body = response.data;
            if (!body?.status) {
                throw new common_1.BadRequestException(body?.message ?? 'Failed to initialize Paystack transaction');
            }
            return {
                status: body.status,
                message: body.message,
                data: {
                    authorizationUrl: body.data?.authorization_url ?? null,
                    accessCode: body.data?.access_code ?? null,
                    reference: body.data?.reference ?? input.reference,
                },
            };
        }
        catch (error) {
            console.error('Paystack initialize failed:', {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message,
            });
            throw new common_1.BadRequestException(error?.response?.data?.message ??
                'Failed to initialize Paystack transaction');
        }
    }
    async verifyTransaction(companyId, storeId, reference) {
        if (!reference) {
            throw new common_1.BadRequestException('reference is required');
        }
        const { secretKey } = await this.getSecretKey(companyId, storeId);
        const response = await (0, rxjs_1.firstValueFrom)(this.http.get(`${this.baseUrl}/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${secretKey}`,
            },
        }));
        const body = response.data;
        if (!body?.status) {
            throw new common_1.BadRequestException(body?.message ?? 'Failed to verify Paystack transaction');
        }
        const data = body.data;
        return {
            provider: 'paystack',
            verified: data?.status === 'success',
            reference: data?.reference ?? reference,
            status: data?.status ?? null,
            amount: typeof data?.amount === 'number' ? data.amount / 100 : null,
            currency: data?.currency ?? null,
            paidAt: data?.paid_at ?? null,
            channel: data?.channel ?? null,
            gatewayResponse: data?.gateway_response ?? null,
            customer: data?.customer ?? null,
            authorization: data?.authorization ?? null,
            raw: data,
        };
    }
    async verifyAndSyncOrder(companyId, storeId, reference) {
        const result = await this.verifyTransaction(companyId, storeId, reference);
        const orderId = result.raw?.metadata?.orderId ?? null;
        if (!orderId && !result.reference) {
            throw new common_1.BadRequestException('Unable to resolve order from payment');
        }
        const [order] = await this.db
            .select()
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
            .execute();
        if (!order) {
            throw new common_1.NotFoundException('Order not found for this payment');
        }
        if (result.verified) {
            await this.payment.finalizeGatewayPaymentForOrder({
                companyId,
                storeId,
                orderId: order.id ?? null,
                provider: 'paystack',
                providerRef: result.reference,
                providerEventId: null,
                amountMinor: Math.round(Number(result.amount ?? 0) * 100),
                currency: 'NGN',
                paidAt: result.paidAt ?? null,
                meta: {
                    gatewayResponse: result.gatewayResponse ?? null,
                    channel: result.channel ?? null,
                    authorization: result.authorization ?? null,
                    customer: result.customer ?? null,
                    raw: result.raw ?? null,
                },
                confirmedByUserId: null,
            });
        }
        return {
            ...result,
            orderId: order.id,
        };
    }
    validateWebhookSignature(rawBody, signature, secretKey) {
        if (!signature)
            return false;
        const hash = crypto
            .createHmac('sha512', secretKey)
            .update(rawBody)
            .digest('hex');
        return hash === signature;
    }
    async processWebhook(companyId, storeId, rawBody, signature) {
        const { secretKey } = await this.getSecretKey(companyId, storeId);
        const isValid = this.validateWebhookSignature(rawBody, signature, secretKey);
        if (!isValid) {
            throw new common_1.BadRequestException('Invalid Paystack webhook signature');
        }
        const event = typeof rawBody === 'string'
            ? JSON.parse(rawBody)
            : JSON.parse(rawBody.toString('utf8'));
        return {
            valid: true,
            event: event?.event ?? null,
            reference: event?.data?.reference ?? null,
            status: event?.data?.status ?? null,
            amount: typeof event?.data?.amount === 'number'
                ? event.data.amount / 100
                : null,
            currency: event?.data?.currency ?? null,
            raw: event,
        };
    }
};
exports.PaystackService = PaystackService;
exports.PaystackService = PaystackService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, axios_1.HttpService,
        orders_service_1.OrdersService,
        payment_service_1.PaymentService])
], PaystackService);
//# sourceMappingURL=paystack.service.js.map