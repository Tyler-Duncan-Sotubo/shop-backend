"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorefrontMailModule = void 0;
const common_1 = require("@nestjs/common");
const mail_controller_1 = require("./mail.controller");
let StorefrontMailModule = class StorefrontMailModule {
};
exports.StorefrontMailModule = StorefrontMailModule;
exports.StorefrontMailModule = StorefrontMailModule = __decorate([
    (0, common_1.Module)({
        controllers: [mail_controller_1.MailController],
    })
], StorefrontMailModule);
//# sourceMappingURL=mail.module.js.map