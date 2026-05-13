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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetEmailService = void 0;
const common_1 = require("@nestjs/common");
const resend_provider_1 = require("../resend.provider");
const password_reset_html_1 = require("../templates/password-reset.html");
let PasswordResetEmailService = class PasswordResetEmailService {
    constructor(resend) {
        this.resend = resend;
    }
    async sendPasswordResetEmail(email, name, url) {
        try {
            await this.resend.client.emails.send({
                to: email,
                from: 'noreply@mycenta.com',
                subject: 'Reset your password',
                html: (0, password_reset_html_1.passwordResetHtml)({ name, verifyLink: url }),
            });
        }
        catch (error) {
            console.error(error);
            throw error;
        }
    }
};
exports.PasswordResetEmailService = PasswordResetEmailService;
exports.PasswordResetEmailService = PasswordResetEmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [resend_provider_1.ResendProvider])
], PasswordResetEmailService);
//# sourceMappingURL=password-reset.service.js.map