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
exports.CreditsController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../infrastructure/interceptor/base.controller");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorator/current-user.decorator");
const credits_service_1 = require("../../../domains/credits/credits.service");
const credits_dto_1 = require("./dto/credits.dto");
let CreditsController = class CreditsController extends base_controller_1.BaseController {
    constructor(credits) {
        super();
        this.credits = credits;
    }
    getBalance(user) {
        return this.credits.getBalance(user.companyId);
    }
    getTransactions(user, q) {
        return this.credits.getTransactions(user.companyId, q);
    }
    topUp(user, body) {
        return this.credits.topUp(user.companyId, body.amount, body.channel, body.note);
    }
    adjust(user, body) {
        return this.credits.adjust(user.companyId, body.amount, body.channel, body.note);
    }
};
exports.CreditsController = CreditsController;
__decorate([
    (0, common_1.Get)('balance'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CreditsController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, credits_dto_1.GetTransactionsDto]),
    __metadata("design:returntype", void 0)
], CreditsController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Post)('topup'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, credits_dto_1.TopUpDto]),
    __metadata("design:returntype", void 0)
], CreditsController.prototype, "topUp", null);
__decorate([
    (0, common_1.Post)('adjust'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, credits_dto_1.AdjustDto]),
    __metadata("design:returntype", void 0)
], CreditsController.prototype, "adjust", null);
exports.CreditsController = CreditsController = __decorate([
    (0, common_1.Controller)('credits'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [credits_service_1.CreditService])
], CreditsController);
//# sourceMappingURL=credits.controller.js.map