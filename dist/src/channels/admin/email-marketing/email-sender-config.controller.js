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
exports.EmailSenderConfigController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../infrastructure/interceptor/base.controller");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorator/current-user.decorator");
const email_sender_config_service_1 = require("../../../domains/email-marketing/services/email-sender-config.service");
const email_sender_config_dto_1 = require("./dto/email-sender-config.dto");
let EmailSenderConfigController = class EmailSenderConfigController extends base_controller_1.BaseController {
    constructor(emailConfig) {
        super();
        this.emailConfig = emailConfig;
    }
    getConfig(user) {
        return this.emailConfig.getConfig(user.companyId);
    }
    upsertConfig(user, body) {
        return this.emailConfig.upsertConfig(user.companyId, body);
    }
};
exports.EmailSenderConfigController = EmailSenderConfigController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmailSenderConfigController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Put)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, email_sender_config_dto_1.UpsertEmailSenderConfigDto]),
    __metadata("design:returntype", void 0)
], EmailSenderConfigController.prototype, "upsertConfig", null);
exports.EmailSenderConfigController = EmailSenderConfigController = __decorate([
    (0, common_1.Controller)('email-config'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [email_sender_config_service_1.EmailSenderConfigService])
], EmailSenderConfigController);
//# sourceMappingURL=email-sender-config.controller.js.map