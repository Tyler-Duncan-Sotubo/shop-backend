"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetupModule = void 0;
const common_1 = require("@nestjs/common");
const setup_service_1 = require("./setup.service");
const storefront_override_service_1 = require("../storefront-config/services/storefront-override.service");
const media_service_1 = require("../media/media.service");
const storefront_config_service_1 = require("../storefront-config/services/storefront-config.service");
const storefront_revalidate_service_1 = require("../storefront-config/services/storefront-revalidate.service");
const aws_service_1 = require("../../infrastructure/aws/aws.service");
let SetupModule = class SetupModule {
};
exports.SetupModule = SetupModule;
exports.SetupModule = SetupModule = __decorate([
    (0, common_1.Module)({
        providers: [
            setup_service_1.SetupService,
            storefront_override_service_1.StorefrontOverrideService,
            media_service_1.MediaService,
            storefront_config_service_1.StorefrontConfigService,
            storefront_revalidate_service_1.StorefrontRevalidateService,
            aws_service_1.AwsService,
        ],
        exports: [setup_service_1.SetupService],
    })
], SetupModule);
//# sourceMappingURL=setup.module.js.map