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
exports.MailController = void 0;
const common_1 = require("@nestjs/common");
const create_subscriber_dto_1 = require("./dto/create-subscriber.dto");
const create_contact_message_dto_1 = require("./dto/create-contact-message.dto");
const throttler_1 = require("@nestjs/throttler");
const mail_service_1 = require("../../../domains/mail/mail.service");
const storefront_guard_1 = require("../common/guard/storefront.guard");
const current_company_id_decorator_1 = require("../common/decorators/current-company-id.decorator");
const current_store_decorator_1 = require("../common/decorators/current-store.decorator");
let MailController = class MailController {
    constructor(mailService) {
        this.mailService = mailService;
    }
    createSubscriberPublic(companyId, storeId, dto, ip) {
        const payload = {
            ...dto,
            storeId,
        };
        return this.mailService.createSubscriber(companyId, payload, {
            ip,
        });
    }
    createContactMessagePublic(companyId, storeId, dto, ip) {
        const payload = {
            ...dto,
            storeId,
        };
        return this.mailService.createContactMessage(companyId, payload, {
            ip,
        });
    }
};
exports.MailController = MailController;
__decorate([
    (0, common_1.Post)('subscribe'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_subscriber_dto_1.CreateSubscriberDto, String]),
    __metadata("design:returntype", void 0)
], MailController.prototype, "createSubscriberPublic", null);
__decorate([
    (0, common_1.Post)('contact'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_contact_message_dto_1.CreateContactMessageDto, String]),
    __metadata("design:returntype", void 0)
], MailController.prototype, "createContactMessagePublic", null);
exports.MailController = MailController = __decorate([
    (0, common_1.Controller)('mail'),
    __metadata("design:paramtypes", [mail_service_1.MailService])
], MailController);
//# sourceMappingURL=mail.controller.js.map