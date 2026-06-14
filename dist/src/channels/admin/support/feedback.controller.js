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
exports.SupportFeedbackController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../infrastructure/interceptor/base.controller");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorator/current-user.decorator");
const feedback_service_1 = require("../../../domains/support/feedback.service");
const feedback_dto_1 = require("./dto/feedback.dto");
let SupportFeedbackController = class SupportFeedbackController extends base_controller_1.BaseController {
    constructor(feedback) {
        super();
        this.feedback = feedback;
    }
    async create(user, dto) {
        return this.feedback.create(dto, user.companyId);
    }
};
exports.SupportFeedbackController = SupportFeedbackController;
__decorate([
    (0, common_1.Post)('feedback'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, feedback_dto_1.CreateFeedbackDto]),
    __metadata("design:returntype", Promise)
], SupportFeedbackController.prototype, "create", null);
exports.SupportFeedbackController = SupportFeedbackController = __decorate([
    (0, common_1.Controller)('support'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [feedback_service_1.SupportFeedbackService])
], SupportFeedbackController);
//# sourceMappingURL=feedback.controller.js.map