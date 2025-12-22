// src/company-settings/settings/onboarding.ts
import { CompanySettingSeed } from './types';

export const onboardingSettings: CompanySettingSeed[] = [
  // Required steps
  { key: 'onboarding.store_setup_complete', value: false },
  { key: 'onboarding.location_setup_complete', value: false },
  { key: 'onboarding.payment_setup_complete', value: false },
  { key: 'onboarding.branding_complete', value: false },

  // Recommended steps
  { key: 'onboarding.checkout_review_complete', value: false },
  { key: 'onboarding.tax_review_complete', value: false },
  { key: 'onboarding.team_invite_complete', value: false },
];
