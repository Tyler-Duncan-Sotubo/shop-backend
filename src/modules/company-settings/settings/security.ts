import { CompanySettingSeed } from './types';

export const securitySettings: CompanySettingSeed[] = [
  // 2FA policies
  { key: 'security.two_factor_auth_required_for_admins', value: false },
  { key: 'security.two_factor_auth_optional_for_staff', value: true },

  // Session timeout in minutes
  { key: 'security.session_timeout_minutes', value: 60 * 8 }, // 8 hours

  // Optional IP restrictions (empty means not enforced)
  { key: 'security.allowed_ip_ranges', value: [] }, // e.g. ["10.0.0.0/8"]

  // Rate limiting knobs (global; actual enforcement in middleware)
  { key: 'security.rate_limit.enabled', value: true },
  { key: 'security.rate_limit.window_seconds', value: 60 },
  { key: 'security.rate_limit.max_requests', value: 120 },
];
