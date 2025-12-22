"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productCategoriesRelations = exports.categoriesRelations = exports.productImagesRelations = exports.productOptionValuesRelations = exports.productOptionsRelations = exports.productVariantsRelations = exports.productsRelations = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const products_schema_1 = require("./products.schema");
const variants_schema_1 = require("./variants.schema");
const options_schema_1 = require("./options.schema");
const images_schema_1 = require("./images.schema");
const categories_schema_1 = require("./categories.schema");
exports.productsRelations = (0, drizzle_orm_1.relations)(products_schema_1.products, ({ one, many }) => ({
    variants: many(variants_schema_1.productVariants),
    options: many(options_schema_1.productOptions),
    images: many(images_schema_1.productImages),
    productCategories: many(categories_schema_1.productCategories),
    defaultImage: one(images_schema_1.productImages, {
        fields: [products_schema_1.products.defaultImageId],
        references: [images_schema_1.productImages.id],
    }),
    defaultVariant: one(variants_schema_1.productVariants, {
        fields: [products_schema_1.products.defaultVariantId],
        references: [variants_schema_1.productVariants.id],
    }),
}));
exports.productVariantsRelations = (0, drizzle_orm_1.relations)(variants_schema_1.productVariants, ({ one }) => ({
    product: one(products_schema_1.products, {
        fields: [variants_schema_1.productVariants.productId],
        references: [products_schema_1.products.id],
    }),
    image: one(images_schema_1.productImages, {
        fields: [variants_schema_1.productVariants.imageId],
        references: [images_schema_1.productImages.id],
    }),
}));
exports.productOptionsRelations = (0, drizzle_orm_1.relations)(options_schema_1.productOptions, ({ one, many }) => ({
    product: one(products_schema_1.products, {
        fields: [options_schema_1.productOptions.productId],
        references: [products_schema_1.products.id],
    }),
    values: many(options_schema_1.productOptionValues),
}));
exports.productOptionValuesRelations = (0, drizzle_orm_1.relations)(options_schema_1.productOptionValues, ({ one }) => ({
    option: one(options_schema_1.productOptions, {
        fields: [options_schema_1.productOptionValues.productOptionId],
        references: [options_schema_1.productOptions.id],
    }),
}));
exports.productImagesRelations = (0, drizzle_orm_1.relations)(images_schema_1.productImages, ({ one }) => ({
    product: one(products_schema_1.products, {
        fields: [images_schema_1.productImages.productId],
        references: [products_schema_1.products.id],
    }),
    variant: one(variants_schema_1.productVariants, {
        fields: [images_schema_1.productImages.variantId],
        references: [variants_schema_1.productVariants.id],
    }),
}));
exports.categoriesRelations = (0, drizzle_orm_1.relations)(categories_schema_1.categories, ({ one, many }) => ({
    parent: one(categories_schema_1.categories, {
        fields: [categories_schema_1.categories.parentId],
        references: [categories_schema_1.categories.id],
        relationName: 'parent',
    }),
    children: many(categories_schema_1.categories, {
        relationName: 'parent',
    }),
    productCategories: many(categories_schema_1.productCategories),
}));
exports.productCategoriesRelations = (0, drizzle_orm_1.relations)(categories_schema_1.productCategories, ({ one }) => ({
    product: one(products_schema_1.products, {
        fields: [categories_schema_1.productCategories.productId],
        references: [products_schema_1.products.id],
    }),
    category: one(categories_schema_1.categories, {
        fields: [categories_schema_1.productCategories.categoryId],
        references: [categories_schema_1.categories.id],
    }),
}));
//# sourceMappingURL=catalog.relations.js.map