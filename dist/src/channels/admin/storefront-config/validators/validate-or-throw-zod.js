"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOrThrowZod = validateOrThrowZod;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
function validateOrThrowZod(err, tag = 'validation') {
    if (err instanceof zod_1.ZodError) {
        throw new common_1.BadRequestException({
            message: 'Invalid configuration',
            tag,
            issues: err.issues.map((i) => ({
                path: i.path.join('.'),
                message: i.message,
                code: i.code,
            })),
        });
    }
    throw new common_1.BadRequestException({ message: 'Invalid configuration', tag });
}
//# sourceMappingURL=validate-or-throw-zod.js.map