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
const mail_service_1 = require("./mail.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorator/current-user.decorator");
const api_key_guard_1 = require("../iam/api-keys/guard/api-key.guard");
const current_store_decorator_1 = require("../iam/api-keys/decorators/current-store.decorator");
const api_scopes_decorator_1 = require("../iam/api-keys/decorators/api-scopes.decorator");
const list_subscribers_query_dto_1 = require("./dto/list-subscribers.query.dto");
const update_subscriber_status_dto_1 = require("./dto/update-subscriber-status.dto");
const list_contact_messages_query_dto_1 = require("./dto/list-contact-messages.query.dto");
const update_contact_status_dto_1 = require("./dto/update-contact-status.dto");
const create_subscriber_dto_1 = require("./dto/create-subscriber.dto");
const create_contact_message_dto_1 = require("./dto/create-contact-message.dto");
const class_validator_1 = require("class-validator");
const current_company_id_decorator_1 = require("../iam/api-keys/decorators/current-company-id.decorator");
const throttler_1 = require("@nestjs/throttler");
class IdParamDto {
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], IdParamDto.prototype, "id", void 0);
let MailController = class MailController {
    constructor(mailService) {
        this.mailService = mailService;
    }
    listSubscribersAdmin(user, query) {
        return this.mailService.listSubscribers(user.companyId, query);
    }
    getSubscriberAdmin(user, params) {
        return this.mailService.getSubscriber(user.companyId, params.id);
    }
    updateSubscriberStatusAdmin(user, params, dto) {
        return this.mailService.updateSubscriberStatus(user.companyId, params.id, dto.status);
    }
    listContactMessagesAdmin(user, query) {
        return this.mailService.listContactMessages(user.companyId, query);
    }
    getContactMessageAdmin(user, params) {
        return this.mailService.getContactMessage(user.companyId, params.id);
    }
    updateContactMessageStatusAdmin(user, params, dto) {
        return this.mailService.updateContactMessageStatus(user.companyId, params.id, dto.status);
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
    (0, common_1.Get)('subscribers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['mail.subscribers.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_subscribers_query_dto_1.ListSubscribersQueryDto]),
    __metadata("design:returntype", void 0)
], MailController.prototype, "listSubscribersAdmin", null);
__decorate([
    (0, common_1.Get)('subscribers/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['mail.subscribers.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, IdParamDto]),
    __metadata("design:returntype", void 0)
], MailController.prototype, "getSubscriberAdmin", null);
__decorate([
    (0, common_1.Patch)('subscribers/:id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['mail.subscribers.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, IdParamDto,
        update_subscriber_status_dto_1.UpdateSubscriberStatusDto]),
    __metadata("design:returntype", void 0)
], MailController.prototype, "updateSubscriberStatusAdmin", null);
__decorate([
    (0, common_1.Get)('contact-messages'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['mail.messages.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_contact_messages_query_dto_1.ListContactMessagesQueryDto]),
    __metadata("design:returntype", void 0)
], MailController.prototype, "listContactMessagesAdmin", null);
__decorate([
    (0, common_1.Get)('contact-messages/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['mail.messages.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, IdParamDto]),
    __metadata("design:returntype", void 0)
], MailController.prototype, "getContactMessageAdmin", null);
__decorate([
    (0, common_1.Patch)('contact-messages/:id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['mail.messages.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, IdParamDto,
        update_contact_status_dto_1.UpdateContactMessageStatusDto]),
    __metadata("design:returntype", void 0)
], MailController.prototype, "updateContactMessageStatusAdmin", null);
__decorate([
    (0, common_1.Post)('public/subscribe'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    (0, api_scopes_decorator_1.ApiScopes)('mail.subscribe'),
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
    (0, common_1.Post)('public/contact'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    (0, api_scopes_decorator_1.ApiScopes)('mail.contact'),
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