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
exports.EmployeeInvitationService = void 0;
const common_1 = require("@nestjs/common");
const resend_provider_1 = require("../resend.provider");
const invitation_html_1 = require("../templates/invitation.html");
let EmployeeInvitationService = class EmployeeInvitationService {
    constructor(resend) {
        this.resend = resend;
    }
    async sendInvitationEmail(email, name, companyName, role, url) {
        try {
            await this.resend.client.emails.send({
                to: email,
                from: 'noreply@mycenta.com',
                subject: `Invitation to Join ${companyName} as ${role}`,
                html: (0, invitation_html_1.invitationHtml)({ name, companyName, verifyLink: url }),
            });
        }
        catch (error) {
            console.error(error);
            throw error;
        }
    }
};
exports.EmployeeInvitationService = EmployeeInvitationService;
exports.EmployeeInvitationService = EmployeeInvitationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [resend_provider_1.ResendProvider])
], EmployeeInvitationService);
//# sourceMappingURL=employee-invitation.service.js.map