"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsModule = void 0;
const common_1 = require("@nestjs/common");
const email_sender_config_service_1 = require("./services/email-sender-config.service");
const campaigns_service_1 = require("./services/campaigns.service");
const campaign_audience_service_1 = require("./services/campaign-audience.service");
const campaign_send_service_1 = require("./services/campaign-send.service");
const campaign_webhook_service_1 = require("./services/campaign-webhook.service");
const resend_provider_1 = require("../notification/resend.provider");
let CampaignsModule = class CampaignsModule {
};
exports.CampaignsModule = CampaignsModule;
exports.CampaignsModule = CampaignsModule = __decorate([
    (0, common_1.Module)({
        providers: [
            resend_provider_1.ResendProvider,
            email_sender_config_service_1.EmailSenderConfigService,
            campaigns_service_1.CampaignService,
            campaign_audience_service_1.CampaignAudienceService,
            campaign_send_service_1.CampaignSendService,
            campaign_webhook_service_1.CampaignWebhookService,
        ],
        exports: [
            email_sender_config_service_1.EmailSenderConfigService,
            campaigns_service_1.CampaignService,
            campaign_audience_service_1.CampaignAudienceService,
            campaign_send_service_1.CampaignSendService,
            campaign_webhook_service_1.CampaignWebhookService,
        ],
    })
], CampaignsModule);
//# sourceMappingURL=campaigns.module.js.map