import { z } from 'zod';

export const PaymentMethods = [
  'visa',
  'mastercard',
  'verve',
  'amex',
  'discover',
  'paypal',
  'apple_pay',
  'google_pay',
  'bank_transfer',
] as const;

export type PaymentMethod = (typeof PaymentMethods)[number];

const PaymentMethodEnum = z.enum(PaymentMethods);
const PaymentsOverrideSchema = z
  .object({
    enabled: z.boolean().optional(),

    methods: z.record(PaymentMethodEnum, z.boolean()).optional(),
  })
  .strict();

export const StorefrontOverridesV1Schema = z
  .object({
    store: z
      .object({
        name: z.string().min(1).optional(),
        locale: z.string().optional(),
        currency: z
          .object({
            code: z.string().min(1).optional(),
            locale: z.string().min(1).optional(),
            fractionDigits: z.number().int().min(0).max(3).optional(),
          })
          .strict() // typo-safe currency
          .optional(),
      })
      .strict() // typo-safe store
      .optional(),

    theme: z
      .object({
        assets: z
          .object({
            logoUrl: z.string().url().optional(),
          })
          .strict() // 🔥 catches logoUr
          .optional(),
      })
      .passthrough() // allow future theme keys
      .optional(),

    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        siteName: z.string().optional(),
        canonicalBaseUrl: z.string().url().optional(),
        ogImage: z
          .object({
            url: z.string().min(1).optional(),
            alt: z.string().optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),

    header: z
      .object({
        topBar: z
          .object({
            enabled: z.boolean().optional(),
            autoplay: z
              .object({
                enabled: z.boolean().optional(),
                intervalMs: z.number().int().min(3000).max(60000).optional(),
              })
              .strict()
              .optional(),
            slides: z.array(z.object({ text: z.string().min(1) })).optional(),
          })
          .strict()
          .optional(),

        nav: z
          .object({
            items: z
              .array(
                z
                  .object({
                    label: z.string().min(1),
                    href: z.string().min(1),
                  })
                  .strict(),
              )
              .optional(),
            icons: z
              .object({
                search: z.boolean().optional(),
                account: z.boolean().optional(),
                wishlist: z.boolean().optional(),
                cart: z.boolean().optional(),
                quote: z.boolean().optional(),
              })
              .strict()
              .optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),

    footer: z
      .object({
        brand: z
          .object({
            logoUrl: z.string().url().optional(),
            blurb: z.string().optional(),
          })
          .strict()
          .optional(),
        newsletter: z
          .object({
            enabled: z.boolean().optional(),
            title: z.string().optional(),
            description: z.string().optional(),
            placeholder: z.string().optional(),
            ctaLabel: z.string().optional(),
          })
          .strict()
          .optional(),
        bottomBar: z
          .object({
            leftText: z.string().optional(),
            payments: PaymentsOverrideSchema.optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),

    pages: z
      .object({
        home: z
          .object({
            hero: z
              .object({
                enabled: z.boolean().optional(),
                content: z
                  .object({
                    eyebrow: z.string().optional(),
                    heading: z.string().optional(),
                    description: z.string().optional(),
                    cta: z
                      .object({
                        label: z.string().optional(),
                        href: z.string().optional(),
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
      .passthrough() // future pages
      .optional(),
  })
  .strict();
