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
    ui: z
      .object({
        headerMenu: z
          .object({
            about: z.boolean().optional(),
            contact: z.boolean().optional(),
            blog: z.boolean().optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
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
        favicon: z
          .object({
            ico: z.string().optional(),
            png: z.string().optional(),
            svg: z.string().optional(),
            appleTouch: z.string().optional(),
          })
          .optional(),
        ogImage: z
          .object({
            url: z.string().optional(),
            alt: z.string().optional(),
          })
          .optional(),
      })
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
            enabled: z.boolean().optional(),
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
          .optional(),
        newsletter: z
          .object({
            enabled: z.boolean().optional(),
            title: z.string().optional(),
            description: z.string().optional(),
            placeholder: z.string().optional(),
            ctaLabel: z.string().optional(),
          })
          .optional(),
        bottomBar: z
          .object({
            leftText: z.string().optional(),
            payments: PaymentsOverrideSchema.optional(),
          })
          .optional(),
      })
      .optional(),
    pages: z
      .object({
        // -----------------------------
        // HOME PAGE
        // -----------------------------
        home: z
          .object({
            hero: z
              .object({
                enabled: z.boolean().optional(),

                image: z
                  .object({
                    src: z.string().min(1).optional(),
                    alt: z.string().optional(),
                  })
                  .optional(),

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
                      .optional(),
                  })
                  .optional(),

                bottomStrip: z
                  .object({
                    enabled: z.boolean().optional(),
                    text: z.string().optional(),
                    className: z.string().optional(),
                  })
                  .optional(),

                // ⚠️ allow existing config keys you don't edit yet
                variant: z.string().optional(),
                layout: z.record(z.unknown()).optional(),
                overlay: z.record(z.unknown()).optional(),
              })
              .optional(),

            // homepage content blocks
            sections: z.array(z.unknown()).optional(),

            // legacy / embedded contact on home (safe passthrough)
            contact: z.record(z.unknown()).optional(),
          })
          .optional(),

        // -----------------------------
        // ABOUT PAGE
        // -----------------------------
        about: z
          .object({
            version: z.number().int().optional(),
            seo: z.record(z.unknown()).optional(),

            // full sections array (AboutEditor sends this)
            sections: z.array(z.unknown()).optional(),
          })
          .optional(),

        // -----------------------------
        // CONTACT PAGE (future-safe)
        // -----------------------------
        contact: z
          .object({
            version: z.number().int().optional(),
            seo: z.record(z.unknown()).optional(),
            sections: z.array(z.unknown()).optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .strict();
