export declare const productsRelations: import("drizzle-orm").Relations<string, {
    variants: import("drizzle-orm").Many<any>;
    options: import("drizzle-orm").Many<"product_options">;
    images: import("drizzle-orm").Many<any>;
    productCategories: import("drizzle-orm").Many<"product_categories">;
    defaultImage: import("drizzle-orm").One<any, false>;
    defaultVariant: import("drizzle-orm").One<any, false>;
}>;
export declare const productVariantsRelations: import("drizzle-orm").Relations<string, {
    product: import("drizzle-orm").One<any, false>;
    image: import("drizzle-orm").One<any, false>;
}>;
export declare const productOptionsRelations: import("drizzle-orm").Relations<"product_options", {
    product: import("drizzle-orm").One<any, true>;
    values: import("drizzle-orm").Many<"product_option_values">;
}>;
export declare const productOptionValuesRelations: import("drizzle-orm").Relations<"product_option_values", {
    option: import("drizzle-orm").One<"product_options", true>;
}>;
export declare const productImagesRelations: import("drizzle-orm").Relations<string, {
    product: import("drizzle-orm").One<any, false>;
    variant: import("drizzle-orm").One<any, false>;
}>;
export declare const categoriesRelations: import("drizzle-orm").Relations<string, {
    parent: import("drizzle-orm").One<any, false>;
    children: import("drizzle-orm").Many<any>;
    productCategories: import("drizzle-orm").Many<"product_categories">;
}>;
export declare const productCategoriesRelations: import("drizzle-orm").Relations<"product_categories", {
    product: import("drizzle-orm").One<any, true>;
    category: import("drizzle-orm").One<any, true>;
}>;
