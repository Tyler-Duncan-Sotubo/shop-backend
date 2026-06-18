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
var CampaignWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignWebhookController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const svix_1 = require("svix");
const campaign_webhook_service_1 = require("../../../domains/campaigns/services/campaign-webhook.service");
let CampaignWebhookController = CampaignWebhookController_1 = class CampaignWebhookController {
    constructor(webhookService, config) {
        this.webhookService = webhookService;
        this.config = config;
        this.logger = new common_1.Logger(CampaignWebhookController_1.name);
    }
    async handle(req, svixId, svixTimestamp, svixSignature) {
        const secret = this.config.get('RESEND_WEBHOOK_SECRET');
        if (!secret) {
            this.logger.warn('RESEND_WEBHOOK_SECRET not set — skipping verification');
        }
        else {
            const rawBody = req.rawBody;
            if (!rawBody) {
                throw new common_1.BadRequestException('Raw body not available.');
            }
            try {
                const wh = new svix_1.Webhook(secret);
                wh.verify(rawBody.toString(), {
                    'svix-id': svixId,
                    'svix-timestamp': svixTimestamp,
                    'svix-signature': svixSignature,
                });
            }
            catch (err) {
                this.logger.warn('Invalid Resend webhook signature', err);
                throw new common_1.BadRequestException('Invalid webhook signature');
            }
        }
        return this.webhookService.handle(req.body);
    }
};
exports.CampaignWebhookController = CampaignWebhookController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('svix-id')),
    __param(2, (0, common_1.Headers)('svix-timestamp')),
    __param(3, (0, common_1.Headers)('svix-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], CampaignWebhookController.prototype, "handle", null);
exports.CampaignWebhookController = CampaignWebhookController = CampaignWebhookController_1 = __decorate([
    (0, common_1.Controller)('webhooks/resend'),
    __metadata("design:paramtypes", [campaign_webhook_service_1.CampaignWebhookService,
        config_1.ConfigService])
], CampaignWebhookController);
//# sourceMappingURL=campaign-webhook.controller.js.map