// src/company-settings/settings/index.ts
import type { CompanySettingSeed } from './types';
import { taxSettings } from './tax';
import { generalSettings } from './general';
import { checkoutSettings } from './checkout';
import { paymentSettings } from './payments';
import { securitySettings } from './security';
import { onboardingSettings } from './onboarding';

export const allCompanySettings: CompanySettingSeed[] = [
  ...generalSettings,
  ...checkoutSettings,
  ...paymentSettings,
  ...taxSettings,
  ...securitySettings,
  ...onboardingSettings,
];
