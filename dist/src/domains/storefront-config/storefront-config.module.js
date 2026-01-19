"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorefrontConfigModule = void 0;
const common_1 = require("@nestjs/common");
const storefront_config_service_1 = require("./services/storefront-config.service");
const api_keys_service_1 = require("../iam/api-keys/api-keys.service");
const stores_service_1 = require("../commerce/stores/stores.service");
const aws_service_1 = require("../../infrastructure/aws/aws.service");
const storefront_override_service_1 = require("./services/storefront-override.service");
const base_theme_admin_service_1 = require("./services/base-theme-admin.service");
const storefront_revalidate_service_1 = require("./services/storefront-revalidate.service");
let StorefrontConfigModule = class StorefrontConfigModule {
};
exports.StorefrontConfigModule = StorefrontConfigModule;
exports.StorefrontConfigModule = StorefrontConfigModule = __decorate([
    (0, common_1.Module)({
        providers: [
            storefront_config_service_1.StorefrontConfigService,
            api_keys_service_1.ApiKeysService,
            stores_service_1.StoresService,
            aws_service_1.AwsService,
            storefront_override_service_1.StorefrontOverrideService,
            base_theme_admin_service_1.BaseThemeAdminService,
            storefront_revalidate_service_1.StorefrontRevalidateService,
        ],
        exports: [
            storefront_config_service_1.StorefrontConfigService,
            storefront_override_service_1.StorefrontOverrideService,
            base_theme_admin_service_1.BaseThemeAdminService,
            storefront_revalidate_service_1.StorefrontRevalidateService,
        ],
    })
], StorefrontConfigModule);
//# sourceMappingURL=storefront-config.module.js.map