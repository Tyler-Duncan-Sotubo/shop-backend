// src/db/schema/catalog/catalog.relations.ts
import { relations } from 'drizzle-orm';

import { products } from './products.schema';
import { productVariants } from './variants.schema';
import { productOptions, productOptionValues } from './options.schema';
import { productImages } from './images.schema';
import { categories, productCategories } from './categories.schema';

// Products --------------------------------------------------------------------
export const productsRelations = relations(products, ({ one, many }) => ({
  variants: many(productVariants),
  options: many(productOptions),
  images: many(productImages),
  productCategories: many(productCategories),

  defaultImage: one(productImages, {
    fields: [products.defaultImageId],
    references: [productImages.id],
  }),

  // Optional convenience: default variant for the product
  defaultVariant: one(productVariants, {
    fields: [products.defaultVariantId],
    references: [productVariants.id],
  }),
}));

// Product Variants -----------------------------------------------------------

export const productVariantsRelations = relations(
  productVariants,
  ({ one }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),

    // ✅ one image per variant (via imageId)
    image: one(productImages, {
      fields: [productVariants.imageId],
      references: [productImages.id],
    }),
  }),
);

// Product Options & Option Values -------------------------------------------

export const productOptionsRelations = relations(
  productOptions,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productOptions.productId],
      references: [products.id],
    }),
    values: many(productOptionValues),
  }),
);

export const productOptionValuesRelations = relations(
  productOptionValues,
  ({ one }) => ({
    option: one(productOptions, {
      fields: [productOptionValues.productOptionId],
      references: [productOptions.id],
    }),
  }),
);

// Product Images -------------------------------------------------------------

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [productImages.variantId],
    references: [productVariants.id],
  }),
}));

// Categories & Product-Categories -------------------------------------------

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'parent',
  }),
  children: many(categories, {
    relationName: 'parent',
  }),
  productCategories: many(productCategories),
}));

export const productCategoriesRelations = relations(
  productCategories,
  ({ one }) => ({
    product: one(products, {
      fields: [productCategories.productId],
      references: [products.id],
    }),
    category: one(categories, {
      fields: [productCategories.categoryId],
      references: [categories.id],
    }),
  }),
);
