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
exports.UpsertBankTransferConfigDto = exports.UpsertGatewayConfigDto = exports.ToggleStorePaymentMethodDto = exports.BankDetailsDto = exports.PaymentProvider = exports.PaymentMethodType = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var PaymentMethodType;
(function (PaymentMethodType) {
    PaymentMethodType["gateway"] = "gateway";
    PaymentMethodType["bank_transfer"] = "bank_transfer";
    PaymentMethodType["cash"] = "cash";
    PaymentMethodType["other"] = "other";
    PaymentMethodType["pos"] = "pos";
})(PaymentMethodType || (exports.PaymentMethodType = PaymentMethodType = {}));
var PaymentProvider;
(function (PaymentProvider) {
    PaymentProvider["paystack"] = "paystack";
    PaymentProvider["stripe"] = "stripe";
    PaymentProvider["fincra"] = "fincra";
})(PaymentProvider || (exports.PaymentProvider = PaymentProvider = {}));
class BankDetailsDto {
}
exports.BankDetailsDto = BankDetailsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], BankDetailsDto.prototype, "accountName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], BankDetailsDto.prototype, "accountNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], BankDetailsDto.prototype, "bankName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BankDetailsDto.prototype, "sortCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BankDetailsDto.prototype, "instructions", void 0);
class ToggleStorePaymentMethodDto {
}
exports.ToggleStorePaymentMethodDto = ToggleStorePaymentMethodDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ToggleStorePaymentMethodDto.prototype, "storeId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(PaymentMethodType),
    __metadata("design:type", String)
], ToggleStorePaymentMethodDto.prototype, "method", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(PaymentProvider),
    __metadata("design:type", String)
], ToggleStorePaymentMethodDto.prototype, "provider", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ToggleStorePaymentMethodDto.prototype, "enabled", void 0);
class UpsertGatewayConfigDto {
}
exports.UpsertGatewayConfigDto = UpsertGatewayConfigDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpsertGatewayConfigDto.prototype, "storeId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(PaymentProvider),
    __metadata("design:type", String)
], UpsertGatewayConfigDto.prototype, "provider", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpsertGatewayConfigDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpsertGatewayConfigDto.prototype, "config", void 0);
class UpsertBankTransferConfigDto {
}
exports.UpsertBankTransferConfigDto = UpsertBankTransferConfigDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpsertBankTransferConfigDto.prototype, "storeId", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpsertBankTransferConfigDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => BankDetailsDto),
    __metadata("design:type", BankDetailsDto)
], UpsertBankTransferConfigDto.prototype, "bankDetails", void 0);
//# sourceMappingURL=payment-methods.dto.js.map