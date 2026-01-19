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
exports.PaymentController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../../infrastructure/interceptor/base.controller");
const presign_dto_1 = require("../dto/presign.dto");
const payment_service_1 = require("../../../../../domains/billing/payment/services/payment.service");
const storefront_guard_1 = require("../../../common/guard/storefront.guard");
const current_company_id_decorator_1 = require("../../../common/decorators/current-company-id.decorator");
let PaymentController = class PaymentController extends base_controller_1.BaseController {
    constructor(paymentsService) {
        super();
        this.paymentsService = paymentsService;
    }
    async presignEvidence(companyId, paymentId, dto) {
        return this.paymentsService.presignPaymentEvidenceUpload({
            companyId,
            paymentId,
            fileName: dto.fileName,
            mimeType: dto.mimeType,
        });
    }
    async finalizeEvidence(companyId, paymentId, dto) {
        if (!dto?.key)
            throw new common_1.BadRequestException('key is required');
        const row = await this.paymentsService.finalizePaymentEvidenceUpload({
            companyId,
            paymentId,
            key: dto.key,
            url: dto.url ?? null,
            fileName: dto.fileName ?? null,
            mimeType: dto.mimeType ?? null,
            note: dto.note ?? null,
        });
        return { data: row };
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    (0, common_1.Post)(':paymentId/evidence/presign'),
    (0, common_1.SetMetadata)('permissions', ['payments.write']),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Param)('paymentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, presign_dto_1.PresignPaymentEvidenceDto]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "presignEvidence", null);
__decorate([
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    (0, common_1.Post)(':paymentId/evidence/finalize'),
    (0, common_1.SetMetadata)('permissions', ['payments.write']),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Param)('paymentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "finalizeEvidence", null);
exports.PaymentController = PaymentController = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], PaymentController);
//# sourceMappingURL=storefront-payment.controller.js.map