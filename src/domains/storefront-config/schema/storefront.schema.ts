import { z } from 'zod';

export const StorefrontConfigV1Schema = z.object({
  version: z.literal(1),

  store: z.object({
    id: z.string(),
    name: z.string(),
    locale: z.string().optional(),
    currency: z
      .object({
        code: z.string(),
        locale: z.string(),
        fractionDigits: z.number(),
      })
      .optional(),
  }),

  theme: z.unknown().optional(),
  seo: z.unknown().optional(),
  ui: z.unknown().optional(),

  header: z.unknown(), // required
  footer: z.unknown().optional(),

  pages: z
    .object({
      home: z.unknown().optional(),
      about: z.unknown().optional(),
      contact: z.unknown().optional(),
      catalogue: z.unknown().optional(),
      blog: z.unknown().optional(),
      account: z.unknown().optional(),
      collections: z.unknown().optional(),
    })
    .optional(),
});

export const storefrontBaseSchemaV1 = z.object({
  key: z.string(),
  version: z.number(),
  theme: z.unknown(),
  ui: z.unknown(),
  seo: z.unknown(),
  header: z.unknown(),
  footer: z.unknown(),
  pages: z.unknown(),
});

export const storefrontThemeSchemaV1 = z.object({
  key: z.string().min(1),
  version: z.number().int().positive().default(1),
  companyId: z.string().uuid().nullable().optional(),
  theme: z.record(z.any()).optional().default({}),
  ui: z.record(z.any()).optional().default({}),
  seo: z.record(z.any()).optional().default({}),
  header: z.record(z.any()).optional().default({}),
  footer: z.record(z.any()).optional().default({}),
  pages: z.record(z.any()).optional().default({}),

  isActive: z.boolean().optional().default(true),
});

// Enums and Extras  //
