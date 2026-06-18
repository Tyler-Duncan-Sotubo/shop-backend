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
var BillingPaystackService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingPaystackService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
const crypto = require("crypto");
const BASE_URL = 'https://api.paystack.co';
let BillingPaystackService = BillingPaystackService_1 = class BillingPaystackService {
    constructor(http, config) {
        this.http = http;
        this.config = config;
        this.logger = new common_1.Logger(BillingPaystackService_1.name);
    }
    get secretKey() {
        const key = this.config.get('PAYSTACK_BILLING_SECRET_KEY');
        if (!key) {
            throw new common_1.BadRequestException('PAYSTACK_BILLING_SECRET_KEY is not configured');
        }
        return key;
    }
    get frontendUrl() {
        return this.config.get('FRONTEND_URL') ?? 'http://localhost:3000';
    }
    toKobo(amountNGN) {
        if (!Number.isFinite(amountNGN) || amountNGN <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than 0');
        }
        return Math.round(amountNGN * 100);
    }
    async initializeTransaction(input) {
        const payload = {
            email: input.email,
            amount: this.toKobo(input.amountNGN),
            currency: 'NGN',
            reference: input.reference,
            callback_url: input.callbackUrl ?? `${this.frontendUrl}/billing?topup=success`,
            metadata: input.metadata ?? undefined,
        };
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.post(`${BASE_URL}/transaction/initialize`, payload, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
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
            this.logger.error('Paystack billing initialize failed', {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message,
            });
            throw new common_1.BadRequestException(error?.response?.data?.message ??
                'Failed to initialize billing payment');
        }
    }
    async verifyTransaction(reference) {
        if (!reference) {
            throw new common_1.BadRequestException('Reference is required');
        }
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.get(`${BASE_URL}/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                },
            }));
            const body = response.data;
            if (!body?.status) {
                throw new common_1.BadRequestException(body?.message ?? 'Failed to verify Paystack transaction');
            }
            const data = body.data;
            return {
                verified: data?.status === 'success',
                reference: data?.reference ?? reference,
                status: data?.status ?? null,
                amountNGN: typeof data?.amount === 'number' ? data.amount / 100 : null,
                currency: data?.currency ?? null,
                paidAt: data?.paid_at ?? null,
                channel: data?.channel ?? null,
                gatewayResponse: data?.gateway_response ?? null,
                customer: data?.customer ?? null,
                metadata: data?.metadata ?? null,
                raw: data,
            };
        }
        catch (error) {
            this.logger.error('Paystack billing verify failed', {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message,
            });
            throw new common_1.BadRequestException(error?.response?.data?.message ?? 'Failed to verify billing payment');
        }
    }
    validateWebhookSignature(rawBody, signature) {
        if (!signature)
            return false;
        const hash = crypto
            .createHmac('sha512', this.secretKey)
            .update(rawBody)
            .digest('hex');
        return hash === signature;
    }
    processWebhook(rawBody, signature) {
        const isValid = this.validateWebhookSignature(rawBody, signature);
        if (!isValid) {
            throw new common_1.BadRequestException('Invalid Paystack billing webhook signature');
        }
        const event = typeof rawBody === 'string'
            ? JSON.parse(rawBody)
            : JSON.parse(rawBody.toString('utf8'));
        return {
            valid: true,
            event: event?.event ?? null,
            reference: event?.data?.reference ?? null,
            status: event?.data?.status ?? null,
            amountNGN: typeof event?.data?.amount === 'number'
                ? event.data.amount / 100
                : null,
            currency: event?.data?.currency ?? null,
            metadata: event?.data?.metadata ?? null,
            raw: event,
        };
    }
    async createPlan(input) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.post(`${BASE_URL}/plan`, {
                name: input.name,
                amount: this.toKobo(input.amountNGN),
                interval: input.interval,
                currency: 'NGN',
            }, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json',
                },
            }));
            const body = response.data;
            if (!body?.status) {
                throw new common_1.BadRequestException(body?.message ?? 'Failed to create Paystack plan');
            }
            return {
                planCode: body.data?.plan_code ?? null,
                name: body.data?.name ?? null,
                amount: body.data?.amount ?? null,
                interval: body.data?.interval ?? null,
            };
        }
        catch (error) {
            this.logger.error('Paystack create plan failed', error?.response?.data);
            throw new common_1.BadRequestException(error?.response?.data?.message ?? 'Failed to create Paystack plan');
        }
    }
    async cancelSubscription(subscriptionCode, emailToken) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.post(`${BASE_URL}/subscription/disable`, {
                code: subscriptionCode,
                token: emailToken,
            }, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json',
                },
            }));
            const body = response.data;
            if (!body?.status) {
                throw new common_1.BadRequestException(body?.message ?? 'Failed to cancel Paystack subscription');
            }
            return { success: true, message: body.message };
        }
        catch (error) {
            this.logger.error('Paystack cancel subscription failed', error?.response?.data);
            throw new common_1.BadRequestException(error?.response?.data?.message ??
                'Failed to cancel Paystack subscription');
        }
    }
};
exports.BillingPaystackService = BillingPaystackService;
exports.BillingPaystackService = BillingPaystackService = BillingPaystackService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], BillingPaystackService);
//# sourceMappingURL=billing-paystack.service.js.map