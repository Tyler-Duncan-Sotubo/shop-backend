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
exports.CampaignsController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../infrastructure/interceptor/base.controller");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorator/current-user.decorator");
const campaigns_service_1 = require("../../../domains/email-marketing/services/campaigns.service");
const campaign_send_service_1 = require("../../../domains/email-marketing/services/campaign-send.service");
const campaign_audience_service_1 = require("../../../domains/email-marketing/services/campaign-audience.service");
const campaign_dto_1 = require("./dto/campaign.dto");
let CampaignsController = class CampaignsController extends base_controller_1.BaseController {
    constructor(campaignService, campaignSendService, audienceService) {
        super();
        this.campaignService = campaignService;
        this.campaignSendService = campaignSendService;
        this.audienceService = audienceService;
    }
    create(user, body) {
        return this.campaignService.create(user.companyId, body);
    }
    list(user, q) {
        return this.campaignService.list(user.companyId, q);
    }
    getById(user, id) {
        return this.campaignService.getById(user.companyId, id);
    }
    update(user, id, body) {
        return this.campaignService.update(user.companyId, id, body);
    }
    delete(user, id) {
        return this.campaignService.delete(user.companyId, id);
    }
    schedule(user, id, body) {
        return this.campaignService.schedule(user.companyId, id, new Date(body.scheduledAt));
    }
    unschedule(user, id) {
        return this.campaignService.unschedule(user.companyId, id);
    }
    sendNow(user, id) {
        return this.campaignSendService.sendNow(user.companyId, id);
    }
    sendTest(user, id, body) {
        return this.campaignSendService.sendTest(user.companyId, id, body.toEmail);
    }
    audienceCount(user, q) {
        return this.audienceService.count(user.companyId, q.storeId, q.audienceType);
    }
};
exports.CampaignsController = CampaignsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, campaign_dto_1.CreateCampaignDto]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, campaign_dto_1.ListCampaignsDto]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "getById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, campaign_dto_1.UpdateCampaignDto]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/schedule'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, campaign_dto_1.ScheduleCampaignDto]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "schedule", null);
__decorate([
    (0, common_1.Post)(':id/unschedule'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "unschedule", null);
__decorate([
    (0, common_1.Post)(':id/send'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "sendNow", null);
__decorate([
    (0, common_1.Post)(':id/test'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, campaign_dto_1.SendTestDto]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "sendTest", null);
__decorate([
    (0, common_1.Get)('audience/count'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, campaign_dto_1.AudienceCountDto]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "audienceCount", null);
exports.CampaignsController = CampaignsController = __decorate([
    (0, common_1.Controller)('campaigns'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [campaigns_service_1.CampaignService,
        campaign_send_service_1.CampaignSendService,
        campaign_audience_service_1.CampaignAudienceService])
], CampaignsController);
//# sourceMappingURL=campaigns.controller.js.map