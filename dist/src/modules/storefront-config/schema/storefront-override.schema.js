"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorefrontOverridesV1Schema = exports.PaymentMethods = void 0;
const zod_1 = require("zod");
exports.PaymentMethods = [
    'visa',
    'mastercard',
    'verve',
    'amex',
    'discover',
    'paypal',
    'apple_pay',
    'google_pay',
    'bank_transfer',
];
const PaymentMethodEnum = zod_1.z.enum(exports.PaymentMethods);
const PaymentsOverrideSchema = zod_1.z
    .object({
    enabled: zod_1.z.boolean().optional(),
    methods: zod_1.z.record(PaymentMethodEnum, zod_1.z.boolean()).optional(),
})
    .strict();
exports.StorefrontOverridesV1Schema = zod_1.z
    .object({
    store: zod_1.z
        .object({
        name: zod_1.z.string().min(1).optional(),
        locale: zod_1.z.string().optional(),
        currency: zod_1.z
            .object({
            code: zod_1.z.string().min(1).optional(),
            locale: zod_1.z.string().min(1).optional(),
            fractionDigits: zod_1.z.number().int().min(0).max(3).optional(),
        })
            .strict()
            .optional(),
    })
        .strict()
        .optional(),
    theme: zod_1.z
        .object({
        assets: zod_1.z
            .object({
            logoUrl: zod_1.z.string().url().optional(),
        })
            .strict()
            .optional(),
    })
        .passthrough()
        .optional(),
    seo: zod_1.z
        .object({
        title: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        siteName: zod_1.z.string().optional(),
        canonicalBaseUrl: zod_1.z.string().url().optional(),
        ogImage: zod_1.z
            .object({
            url: zod_1.z.string().min(1).optional(),
            alt: zod_1.z.string().optional(),
        })
            .strict()
            .optional(),
    })
        .strict()
        .optional(),
    header: zod_1.z
        .object({
        topBar: zod_1.z
            .object({
            enabled: zod_1.z.boolean().optional(),
            autoplay: zod_1.z
                .object({
                enabled: zod_1.z.boolean().optional(),
                intervalMs: zod_1.z.number().int().min(3000).max(60000).optional(),
            })
                .strict()
                .optional(),
            slides: zod_1.z.array(zod_1.z.object({ text: zod_1.z.string().min(1) })).optional(),
        })
            .strict()
            .optional(),
        nav: zod_1.z
            .object({
            items: zod_1.z
                .array(zod_1.z
                .object({
                label: zod_1.z.string().min(1),
                href: zod_1.z.string().min(1),
            })
                .strict())
                .optional(),
            icons: zod_1.z
                .object({
                search: zod_1.z.boolean().optional(),
                account: zod_1.z.boolean().optional(),
                wishlist: zod_1.z.boolean().optional(),
                cart: zod_1.z.boolean().optional(),
                quote: zod_1.z.boolean().optional(),
            })
                .strict()
                .optional(),
        })
            .strict()
            .optional(),
    })
        .strict()
        .optional(),
    footer: zod_1.z
        .object({
        brand: zod_1.z
            .object({
            logoUrl: zod_1.z.string().url().optional(),
            blurb: zod_1.z.string().optional(),
        })
            .strict()
            .optional(),
        newsletter: zod_1.z
            .object({
            enabled: zod_1.z.boolean().optional(),
            title: zod_1.z.string().optional(),
            description: zod_1.z.string().optional(),
            placeholder: zod_1.z.string().optional(),
            ctaLabel: zod_1.z.string().optional(),
        })
            .strict()
            .optional(),
        bottomBar: zod_1.z
            .object({
            leftText: zod_1.z.string().optional(),
            payments: PaymentsOverrideSchema.optional(),
        })
            .strict()
            .optional(),
    })
        .strict()
        .optional(),
    pages: zod_1.z
        .object({
        home: zod_1.z
            .object({
            hero: zod_1.z
                .object({
                enabled: zod_1.z.boolean().optional(),
                content: zod_1.z
                    .object({
                    eyebrow: zod_1.z.string().optional(),
                    heading: zod_1.z.string().optional(),
                    description: zod_1.z.string().optional(),
                    cta: zod_1.z
                        .object({
                        label: zod_1.z.string().optional(),
                        href: zod_1.z.string().optional(),
                    })
                        .strict()
                        .optional(),
                })
                    .strict()
                    .optional(),
            })
                .strict()
                .optional(),
        })
            .strict()
            .optional(),
    })
        .passthrough()
        .optional(),
})
    .strict();
//# sourceMappingURL=storefront-override.schema.js.map