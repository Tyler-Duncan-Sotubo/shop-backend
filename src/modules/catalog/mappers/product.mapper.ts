// src/modules/catalog/mappers/product.mapper.ts

import {
  products,
  productImages,
  productOptions,
  productOptionValues,
  productCategories,
  categories,
  productVariants,
} from 'src/drizzle/schema';
import { getEffectivePrice } from '../utils/pricing';
import { StorefrontProductDto } from '../dtos/products/storefront-product.dto';

// ---- DB row types ----
type ProductRow = typeof products.$inferSelect;
type ProductImageRow = typeof productImages.$inferSelect;
type ProductOptionRow = typeof productOptions.$inferSelect;
type ProductOptionValueRow = typeof productOptionValues.$inferSelect;
type ProductCategoryRow = typeof productCategories.$inferSelect;
type CategoryRow = typeof categories.$inferSelect;
type VariantRow = typeof productVariants.$inferSelect;

// ---- Input type with relations for single product ----
// ✅ variants include `image` now (variant.imageId -> productImages.id)
// ✅ product includes `defaultImage` now (products.defaultImageId -> productImages.id)
type ProductWithRelations = ProductRow & {
  variants?: (VariantRow & { image?: ProductImageRow | null })[];
  images?: ProductImageRow[];
  defaultImage?: ProductImageRow | null;

  options?: (ProductOptionRow & { values?: ProductOptionValueRow[] })[];

  productCategories?: (ProductCategoryRow & {
    category?: CategoryRow | null;
  })[];

  defaultVariant?: VariantRow | null;
};

// ---- Woo-like detail response (matches your frontend log; excludes meta_data) ----
export type ProductDetailResponse = {
  id: string;
  name: string;
  slug: string;
  permalink: string;

  type: 'simple' | 'variable' | string;

  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;

  average_rating: string;
  rating_count: number;

  images: { id: string; src: string; alt: string | null }[];
  tags: { id: string; name: string; slug: string }[];

  categories: { id: string; name: string; slug: string }[];

  attributes: {
    id: number;
    name: string;
    slug: string;
    position: number;
    visible: boolean;
    variation: boolean;
    options: string[];
  }[];

  description: string;
  short_description: string;

  variations: {
    id: string;

    price: string;
    regular_price: string;
    sale_price: string;
    on_sale: boolean;

    manage_stock: boolean;
    stock_quantity: number | null;
    stock_status: 'instock' | 'outofstock' | 'onbackorder';

    weight: string;

    image: { id: string; src: string; alt: string | null } | null;

    attributes: { id: number; name: string; option: string }[];

    // ✅ Woo-like meta_data array
    meta_data: { key: string; value: any }[];
  }[];

  manage_stock: boolean;
  stock_quantity: number | null;
  weight: string;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';

  price_html: string;

  // ✅ Woo-like meta_data array (product level)
  meta_data: { key: string; value: any }[];
};

// ---- List row used by listProducts() ----
type ProductListRowStoreFront = {
  id: string;
  name: string;
  slug: string;

  minPrice: number | null;
  maxPrice: number | null;

  imageUrl: string | null;
  categories: { id: string; name: string }[];

  averageRating: number | null;
  ratingCount: number | null;

  priceLabel: string;
  onSale: boolean;
  salePrice: number | null;
  saleLabel: string | null;
  minSalePrice: number | null;
  maxSalePrice: number | null;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function buildPermalink(slug: string): string {
  return `/products/${slug}`;
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace('NGN', '₦');
}

function buildPriceHtmlRange(min: number, max: number) {
  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = 0;

  const minF = formatNaira(min);
  const maxF = formatNaira(max);

  if (min === max) return minF;
  return `${minF} – ${maxF}`;
}

function getVariantEffectivePrice(v: VariantRow): number {
  const effective = getEffectivePrice({
    regularPrice: v.regularPrice,
    salePrice: v.salePrice,
    saleStartAt: v.saleStartAt ?? null,
    saleEndAt: v.saleEndAt ?? null,
  });

  return Number(effective ?? 0);
}

function getVariantRegularPrice(v: VariantRow): number {
  return Number(v.regularPrice ?? 0);
}

function getVariantSalePrice(v: VariantRow): number | null {
  return v.salePrice != null ? Number(v.salePrice) : null;
}

function computeMinMaxPrices(activeVariants: VariantRow[]) {
  if (!activeVariants.length) return { min: 0, max: 0 };

  let min = Infinity;
  let max = -Infinity;

  for (const v of activeVariants) {
    const p = getVariantEffectivePrice(v);
    if (p < min) min = p;
    if (p > max) max = p;
  }

  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = 0;
  return { min, max };
}

function mapProductAttributes(product: ProductWithRelations) {
  const opts = (product.options ?? [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return opts.map((opt, idx) => ({
    id: 0, // Woo often uses 0 for custom attributes
    name: opt.name,
    slug: opt.name, // keep "Size" / "Color" casing like your Woo example
    position: idx,
    visible: true,
    variation: true,
    options: (opt.values ?? []).map((v) => v.value),
  }));
}

/**
 * Convert your DB metadata object into Woo-like meta_data array
 * (and keep value as-is).
 */
function recordToMetaData(record: unknown): { key: string; value: any }[] {
  if (!record || typeof record !== 'object') return [];
  return Object.entries(record as Record<string, any>).map(([key, value]) => ({
    key,
    value,
  }));
}

function buildProductMetaData(product: ProductWithRelations) {
  // Your DB has seoTitle/seoDescription/metadata
  const seoTitle = (product as any).seoTitle ?? null;
  const seoDescription = (product as any).seoDescription ?? null;
  const metadataObj = (product as any).metadata ?? {};

  return [
    { key: 'seo_title', value: seoTitle },
    { key: 'seo_description', value: seoDescription },
    ...recordToMetaData(metadataObj),
  ];
}

function buildVariantMetaData(variant: VariantRow) {
  // Your DB has variant.metadata
  const metadataObj = (variant as any).metadata ?? {};
  return recordToMetaData(metadataObj);
}

function mapVariantToWooLike(
  variant: VariantRow & { image?: ProductImageRow | null },
  product: ProductWithRelations,
) {
  const effective = getVariantEffectivePrice(variant);
  const regular = getVariantRegularPrice(variant);
  const sale = getVariantSalePrice(variant);

  const opts = (product.options ?? [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const attributes: { id: number; name: string; option: string }[] = [];

  if (variant.option1) {
    attributes.push({
      id: 0,
      name: opts[0]?.name ?? 'Option 1',
      option: variant.option1,
    });
  }
  if (variant.option2) {
    attributes.push({
      id: 0,
      name: opts[1]?.name ?? 'Option 2',
      option: variant.option2,
    });
  }
  if (variant.option3) {
    attributes.push({
      id: 0,
      name: opts[2]?.name ?? 'Option 3',
      option: variant.option3,
    });
  }

  // ✅ Woo-like: variation has ONE image (from variant.imageId relation)
  const img = variant.image ?? null;
  const image = img
    ? { id: img.id, src: img.url, alt: img.altText ?? null }
    : null;

  const manage_stock = false;
  const stock_quantity = null;

  // Keep your current behavior: 0-priced treated as out of stock
  const stock_status: 'instock' | 'outofstock' | 'onbackorder' =
    effective > 0 ? 'instock' : 'outofstock';

  return {
    id: variant.id,

    price: String(effective),
    regular_price: String(regular),
    sale_price: sale != null ? String(sale) : '',
    on_sale: sale != null && sale < regular,

    manage_stock,
    stock_quantity,
    stock_status,

    weight: variant.weight != null ? String(variant.weight) : '',

    image,
    attributes,

    // ✅ now populated from your DB metadata object
    meta_data: buildVariantMetaData(variant),
  };
}

// -----------------------------------------------------------------------------
// ✅ Single product mapper (storefront detail)
// -----------------------------------------------------------------------------

export function mapProductToDetailResponse(
  product: ProductWithRelations,
): ProductDetailResponse {
  const hero =
    product.defaultImage ??
    (product.images && product.images.length ? product.images[0] : null);

  const images = hero
    ? [{ id: hero.id, src: hero.url, alt: hero.altText ?? null }]
    : [];

  const rawCats = (product.productCategories ?? [])
    .map((pc) => pc.category)
    .filter(Boolean) as Array<{
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
  }>;

  const byId = new Map(rawCats.map((c) => [c.id, c]));
  const uniqueCats = Array.from(byId.values());

  let orderedCats = uniqueCats;
  const childWithParent = uniqueCats.find(
    (c) => c.parentId && byId.has(c.parentId),
  );
  if (childWithParent?.parentId) {
    const parent = byId.get(childWithParent.parentId)!;
    const child = childWithParent;

    orderedCats = [
      parent,
      child,
      ...uniqueCats.filter((c) => c.id !== parent.id && c.id !== child.id),
    ];
  }

  const categories = orderedCats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));

  const attributes = mapProductAttributes(product);
  const activeVariants = (product.variants ?? []).filter((v) => v.isActive);

  const isVariable =
    attributes.some((a) => a.variation) && activeVariants.length > 0;

  const pricedVariants = activeVariants.filter(
    (v) => getVariantEffectivePrice(v) > 0,
  );
  const pricingBase = pricedVariants.length ? pricedVariants : activeVariants;

  const { min, max } = computeMinMaxPrices(pricingBase);
  const variations = activeVariants.map((v) => mapVariantToWooLike(v, product));

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    permalink: buildPermalink(product.slug),

    type: isVariable ? 'variable' : 'simple',

    price: String(min),
    regular_price: isVariable ? '' : String(min),
    sale_price: '',
    on_sale: false,

    average_rating: Number((product as any).average_rating ?? 0).toFixed(2),
    rating_count: Number((product as any).rating_count ?? 0),

    images,
    tags: [],

    categories,
    attributes,

    description: product.description ?? '',
    short_description: '',

    variations,

    manage_stock: false,
    stock_quantity: null,
    weight: '',
    stock_status: 'instock',

    price_html: buildPriceHtmlRange(min, max),

    meta_data: buildProductMetaData(product),
  };
}

// -----------------------------------------------------------------------------
// ✅ List mapper (storefront cards)
// -----------------------------------------------------------------------------

export function mapProductsListToStorefront(
  rows: ProductListRowStoreFront[],
): StorefrontProductDto[] {
  const rangeLabel = (min?: number | null, max?: number | null) => {
    if (min == null && max == null) return '';
    if (min != null && max != null)
      return min === max ? `${min}` : `${min} - ${max}`;
    return `${min ?? max}`;
  };

  return rows.map((p) => {
    const regularMin = p.minPrice ?? 0;
    // const regularMax = p.maxPrice ?? p.minPrice ?? 0;

    const saleMin = p.minSalePrice ?? null;
    const saleMax = p.maxSalePrice ?? p.minSalePrice ?? null;

    // ✅ compute onSale purely from values
    const onSale =
      saleMin != null && saleMin > 0 && regularMin > 0 && saleMin < regularMin;

    const regularLabel = rangeLabel(p.minPrice, p.maxPrice); // works for single too
    const saleLabel = rangeLabel(saleMin, saleMax); // works for single too

    // ✅ IMPORTANT: price_html must include sale markup when on sale
    const price_html =
      onSale && regularLabel && saleLabel
        ? `<del>${regularLabel}</del> <ins>${saleLabel}</ins>`
        : regularLabel;

    const current = onSale ? saleMin! : regularMin;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      permalink: buildPermalink(p.slug),

      price: String(current),
      regular_price: String(regularMin),
      sale_price: onSale ? String(saleMin) : null,
      on_sale: onSale,

      price_html,

      average_rating: (p.averageRating ?? 0).toFixed(2),
      rating_count: p.ratingCount ?? 0,
      images: p.imageUrl ? [{ src: p.imageUrl, alt: p.name }] : [],
      tags: (p.categories ?? [])
        .slice(0, 1)
        .map((c) => ({ name: c.name, slug: c.id })),
    };
  });
}

// src/features/products/mappers/map-product-to-collection-list-response.ts

export function mapProductToCollectionListResponse(
  product: ProductWithRelations & {
    average_rating?: number;
    rating_count?: number;
    minPrice?: number | null;
    maxPrice?: number | null;
  },
) {
  // ✅ hero image only
  const hero =
    product.defaultImage ??
    (product.images && product.images.length ? product.images[0] : null);

  const images = hero
    ? [{ id: hero.id, src: hero.url, alt: hero.altText ?? null }]
    : [];

  const categories = (product.productCategories ?? [])
    .filter((pc) => pc.category)
    .map((pc) => ({
      id: pc.category!.id,
      name: pc.category!.name,
      slug: pc.category!.slug,
    }));

  // ✅ attributes still come from options/values (no variants needed)
  const attributes = mapProductAttributes(product);

  const min = Number(product.minPrice ?? 0);
  const max = Number(product.maxPrice ?? min);

  const isVariable = attributes.some((a) => a.variation);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    permalink: buildPermalink(product.slug),

    type: isVariable ? 'variable' : 'simple',

    price: String(min),
    regular_price: isVariable ? '' : String(min),
    sale_price: '',
    on_sale: false,

    average_rating: Number(product.average_rating ?? 0).toFixed(2),
    rating_count: Number(product.rating_count ?? 0),

    images,
    tags: [],

    categories,
    attributes,

    price_html: buildPriceHtmlRange(min, max),
  };
}
