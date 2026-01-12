"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PickupModule = void 0;
const common_1 = require("@nestjs/common");
const pickup_service_1 = require("./pickup.service");
const pickup_controller_1 = require("./pickup.controller");
const stores_service_1 = require("../../commerce/stores/stores.service");
const aws_service_1 = require("../../../common/aws/aws.service");
let PickupModule = class PickupModule {
};
exports.PickupModule = PickupModule;
exports.PickupModule = PickupModule = __decorate([
    (0, common_1.Module)({
        controllers: [pickup_controller_1.PickupController],
        providers: [pickup_service_1.PickupService, stores_service_1.StoresService, aws_service_1.AwsService],
    })
], PickupModule);
//# sourceMappingURL=pickup.module.js.map