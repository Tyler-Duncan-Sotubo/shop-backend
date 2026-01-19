"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuthModule = void 0;
const common_1 = require("@nestjs/common");
const auth_login_controller_1 = require("./controllers/auth-login.controller");
const auth_users_controller_1 = require("./controllers/auth-users.controller");
const auth_profile_controller_1 = require("./controllers/auth-profile.controller");
const auth_email_controller_1 = require("./controllers/auth-email.controller");
const auth_module_1 = require("../../../domains/auth/auth.module");
let AdminAuthModule = class AdminAuthModule {
};
exports.AdminAuthModule = AdminAuthModule;
exports.AdminAuthModule = AdminAuthModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [
            auth_login_controller_1.AuthLoginController,
            auth_users_controller_1.AuthUsersController,
            auth_profile_controller_1.AuthProfileController,
            auth_email_controller_1.AuthEmailController,
        ],
    })
], AdminAuthModule);
//# sourceMappingURL=auth.module.js.map