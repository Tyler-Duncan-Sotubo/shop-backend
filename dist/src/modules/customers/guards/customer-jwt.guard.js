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
var CustomerJwtGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerJwtGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const customer_primary_guard_1 = require("./customer-primary.guard");
let CustomerJwtGuard = CustomerJwtGuard_1 = class CustomerJwtGuard {
    constructor(reflector, customerPrimaryGuard) {
        this.reflector = reflector;
        this.customerPrimaryGuard = customerPrimaryGuard;
        this.logger = new common_1.Logger(CustomerJwtGuard_1.name);
    }
    async canActivate(context) {
        const request = context
            .switchToHttp()
            .getRequest();
        try {
            const isAuthenticated = await this.customerPrimaryGuard.canActivate(context);
            if (!isAuthenticated)
                return false;
        }
        catch (error) {
            this.logger.error(error.message ?? error);
            this.handleUnauthorized(request, error.message ?? 'Unauthorized');
        }
        const customer = request.customer;
        if (!customer) {
            this.handleUnauthorized(request, 'Customer does not exist');
        }
        return true;
    }
    handleUnauthorized(request, error) {
        const errorResponse = {
            status: 'error',
            error: { message: error },
        };
        throw new common_1.HttpException(errorResponse, 401);
    }
};
exports.CustomerJwtGuard = CustomerJwtGuard;
exports.CustomerJwtGuard = CustomerJwtGuard = CustomerJwtGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        customer_primary_guard_1.CustomerPrimaryGuard])
], CustomerJwtGuard);
//# sourceMappingURL=customer-jwt.guard.js.map