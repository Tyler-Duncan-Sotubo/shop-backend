"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailModule = void 0;
const common_1 = require("@nestjs/common");
const mail_service_1 = require("./mail.service");
const mail_controller_1 = require("./mail.controller");
const api_keys_service_1 = require("../iam/api-keys/api-keys.service");
const bullmq_1 = require("@nestjs/bullmq");
const contact_notification_service_1 = require("../notification/services/contact-notification.service");
const stores_service_1 = require("../commerce/stores/stores.service");
const aws_service_1 = require("../../common/aws/aws.service");
let MailModule = class MailModule {
};
exports.MailModule = MailModule;
exports.MailModule = MailModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: 'emailQueue',
            }),
        ],
        controllers: [mail_controller_1.MailController],
        providers: [
            mail_service_1.MailService,
            api_keys_service_1.ApiKeysService,
            contact_notification_service_1.ContactNotificationService,
            stores_service_1.StoresService,
            aws_service_1.AwsService,
        ],
    })
], MailModule);
//# sourceMappingURL=mail.module.js.map