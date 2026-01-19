"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.securitySettings = void 0;
exports.securitySettings = [
    { key: 'security.two_factor_auth_required_for_admins', value: false },
    { key: 'security.two_factor_auth_optional_for_staff', value: true },
    { key: 'security.session_timeout_minutes', value: 60 * 8 },
    { key: 'security.allowed_ip_ranges', value: [] },
    { key: 'security.rate_limit.enabled', value: true },
    { key: 'security.rate_limit.window_seconds', value: 60 },
    { key: 'security.rate_limit.max_requests', value: 120 },
];
//# sourceMappingURL=security.js.map