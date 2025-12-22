"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allCompanySettings = void 0;
const tax_1 = require("./tax");
const general_1 = require("./general");
const checkout_1 = require("./checkout");
const payments_1 = require("./payments");
const security_1 = require("./security");
const onboarding_1 = require("./onboarding");
exports.allCompanySettings = [
    ...general_1.generalSettings,
    ...checkout_1.checkoutSettings,
    ...payments_1.paymentSettings,
    ...tax_1.taxSettings,
    ...security_1.securitySettings,
    ...onboarding_1.onboardingSettings,
];
//# sourceMappingURL=index.js.map