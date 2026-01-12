// src/company-settings/settings/index.ts
import type { CompanySettingSeed } from './types';
import { checkoutSettings } from './checkout';
import { paymentSettings } from './payments';
import { securitySettings } from './security';
import { onboardingSettings } from './onboarding';

export const allCompanySettings: CompanySettingSeed[] = [
  ...checkoutSettings,
  ...paymentSettings,
  ...securitySettings,
  ...onboardingSettings,
];
