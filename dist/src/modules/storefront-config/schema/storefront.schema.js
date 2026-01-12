"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storefrontThemeSchemaV1 = exports.storefrontBaseSchemaV1 = exports.StorefrontConfigV1Schema = void 0;
const zod_1 = require("zod");
exports.StorefrontConfigV1Schema = zod_1.z.object({
    version: zod_1.z.literal(1),
    store: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        locale: zod_1.z.string().optional(),
        currency: zod_1.z
            .object({
            code: zod_1.z.string(),
            locale: zod_1.z.string(),
            fractionDigits: zod_1.z.number(),
        })
            .optional(),
    }),
    theme: zod_1.z.unknown().optional(),
    seo: zod_1.z.unknown().optional(),
    ui: zod_1.z.unknown().optional(),
    header: zod_1.z.unknown(),
    footer: zod_1.z.unknown().optional(),
    pages: zod_1.z
        .object({
        home: zod_1.z.unknown().optional(),
        about: zod_1.z.unknown().optional(),
        contact: zod_1.z.unknown().optional(),
        catalogue: zod_1.z.unknown().optional(),
        blog: zod_1.z.unknown().optional(),
        account: zod_1.z.unknown().optional(),
        collections: zod_1.z.unknown().optional(),
    })
        .optional(),
});
exports.storefrontBaseSchemaV1 = zod_1.z.object({
    key: zod_1.z.string(),
    version: zod_1.z.number(),
    theme: zod_1.z.unknown(),
    ui: zod_1.z.unknown(),
    seo: zod_1.z.unknown(),
    header: zod_1.z.unknown(),
    footer: zod_1.z.unknown(),
    pages: zod_1.z.unknown(),
});
exports.storefrontThemeSchemaV1 = zod_1.z.object({
    key: zod_1.z.string().min(1),
    version: zod_1.z.number().int().positive().default(1),
    companyId: zod_1.z.string().uuid().nullable().optional(),
    theme: zod_1.z.record(zod_1.z.any()).optional().default({}),
    ui: zod_1.z.record(zod_1.z.any()).optional().default({}),
    seo: zod_1.z.record(zod_1.z.any()).optional().default({}),
    header: zod_1.z.record(zod_1.z.any()).optional().default({}),
    footer: zod_1.z.record(zod_1.z.any()).optional().default({}),
    pages: zod_1.z.record(zod_1.z.any()).optional().default({}),
    isActive: zod_1.z.boolean().optional().default(true),
});
//# sourceMappingURL=storefront.schema.js.map