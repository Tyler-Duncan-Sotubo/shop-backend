"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersModule = void 0;
const common_1 = require("@nestjs/common");
const customers_service_1 = require("./customers.service");
const customer_auth_service_1 = require("./customer-auth.service");
const jwt_1 = require("@nestjs/jwt");
const admin_customers_service_1 = require("./admin-customers.service");
const stores_service_1 = require("../commerce/stores/stores.service");
const aws_service_1 = require("../../infrastructure/aws/aws.service");
let CustomersModule = class CustomersModule {
};
exports.CustomersModule = CustomersModule;
exports.CustomersModule = CustomersModule = __decorate([
    (0, common_1.Module)({
        providers: [
            customers_service_1.CustomersService,
            customer_auth_service_1.CustomerAuthService,
            jwt_1.JwtService,
            admin_customers_service_1.AdminCustomersService,
            stores_service_1.StoresService,
            aws_service_1.AwsService,
        ],
        exports: [customers_service_1.CustomersService, customer_auth_service_1.CustomerAuthService, admin_customers_service_1.AdminCustomersService],
    })
], CustomersModule);
//# sourceMappingURL=customers.module.js.map