// src/company-settings/settings/onboarding.ts
import { CompanySettingSeed } from './types';

export const onboardingSettings: CompanySettingSeed[] = [
  // -----------------
  // Required onboarding steps
  // -----------------
  {
    key: 'onboarding.payment_setup_complete',
    value: false,
  },
  {
    key: 'onboarding.online_store_customization_complete',
    value: false,
  },
  {
    key: 'onboarding.shipping_setup_complete',
    value: false,
  },
  {
    key: 'onboarding.products_added_complete',
    value: false,
  },

  // -----------------
  // Recommended / optional steps
  // -----------------
  {
    key: 'onboarding.checkout_review_complete',
    value: false,
  },
  {
    key: 'onboarding.tax_review_complete',
    value: false,
  },
  {
    key: 'onboarding.team_invite_complete',
    value: false,
  },
];
