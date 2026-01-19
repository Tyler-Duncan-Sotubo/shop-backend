"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminVariantOptionsModule = void 0;
const common_1 = require("@nestjs/common");
const variant_options_controller_1 = require("./variant-options.controller");
let AdminVariantOptionsModule = class AdminVariantOptionsModule {
};
exports.AdminVariantOptionsModule = AdminVariantOptionsModule;
exports.AdminVariantOptionsModule = AdminVariantOptionsModule = __decorate([
    (0, common_1.Module)({
        controllers: [variant_options_controller_1.VariantOptionsController],
    })
], AdminVariantOptionsModule);
//# sourceMappingURL=variant-options.module.js.map