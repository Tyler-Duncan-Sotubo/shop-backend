"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsAdminModule = void 0;
const common_1 = require("@nestjs/common");
const email_sender_config_controller_1 = require("./email-sender-config.controller");
const campaigns_module_1 = require("../../../domains/campaigns/campaigns.module");
const campaigns_controller_1 = require("./campaigns.controller");
const campaign_webhook_controller_1 = require("./campaign-webhook.controller");
let CampaignsAdminModule = class CampaignsAdminModule {
};
exports.CampaignsAdminModule = CampaignsAdminModule;
exports.CampaignsAdminModule = CampaignsAdminModule = __decorate([
    (0, common_1.Module)({
        imports: [campaigns_module_1.CampaignsModule],
        controllers: [
            campaigns_controller_1.CampaignsController,
            email_sender_config_controller_1.EmailSenderConfigController,
            campaign_webhook_controller_1.CampaignWebhookController,
        ],
    })
], CampaignsAdminModule);
//# sourceMappingURL=campaigns-admin.module.js.map