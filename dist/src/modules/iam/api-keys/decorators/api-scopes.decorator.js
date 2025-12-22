"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiScopes = void 0;
const common_1 = require("@nestjs/common");
const ApiScopes = (...scopes) => (0, common_1.SetMetadata)('apiScopes', scopes);
exports.ApiScopes = ApiScopes;
//# sourceMappingURL=api-scopes.decorator.js.map