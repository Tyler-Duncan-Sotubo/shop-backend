"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allCompanySettings = void 0;
const checkout_1 = require("./checkout");
const payments_1 = require("./payments");
const security_1 = require("./security");
const onboarding_1 = require("./onboarding");
exports.allCompanySettings = [
    ...checkout_1.checkoutSettings,
    ...payments_1.paymentSettings,
    ...security_1.securitySettings,
    ...onboarding_1.onboardingSettings,
];
//# sourceMappingURL=index.js.map