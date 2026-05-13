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
exports.EmailVerificationService = void 0;
const common_1 = require("@nestjs/common");
const resend_provider_1 = require("../resend.provider");
const email_verification_html_1 = require("../templates/email-verification.html");
const verify_login_html_1 = require("../templates/verify-login.html");
let EmailVerificationService = class EmailVerificationService {
    constructor(resend) {
        this.resend = resend;
    }
    async sendVerifyEmail(email, token, companyName) {
        try {
            await this.resend.client.emails.send({
                to: email,
                from: 'noreply@mycenta.com',
                subject: 'Verify your email',
                html: (0, email_verification_html_1.emailVerificationHtml)({
                    verificationCode: token,
                    companyName: companyName ?? email,
                }),
            });
        }
        catch (error) {
            console.error(error);
            throw error;
        }
    }
    async sendVerifyLogin(email, token) {
        try {
            await this.resend.client.emails.send({
                to: email,
                from: 'noreply@mycenta.com',
                subject: 'Your login verification code',
                html: (0, verify_login_html_1.verifyLoginHtml)({
                    verificationCode: token,
                }),
            });
        }
        catch (error) {
            console.error(error);
            throw error;
        }
    }
};
exports.EmailVerificationService = EmailVerificationService;
exports.EmailVerificationService = EmailVerificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [resend_provider_1.ResendProvider])
], EmailVerificationService);
//# sourceMappingURL=email-verification.service.js.map