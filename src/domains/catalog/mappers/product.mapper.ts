// src/modules/catalog/mappers/product.mapper.ts

import {
  products,
  productImages,
  productOptions,
  productOptionValues,
  productCategories,
  categories,
  productVariants,
} from 'src/infrastructure/drizzle/schema';
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
  moq: number;

  average_rating: string;
  rating_count: number;

  images: { id: string; src: string; alt: string | null }[];
  tags: { id: string; name: string; slug: string }[];

  categories: {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    isHub?: boolean;
  }[];

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

export function buildPriceHtmlRange(min: number, max: number) {
  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = 0;

  const minF = formatNaira(min);
  const maxF = formatNaira(max);

  if (min === max) return minF;
  return `${minF} – ${maxF}`;
}

export function buildDiscountAwarePriceHtml(
  minRegular: number,
  maxRegular: number,
  minSale: number | null,
  onSale: boolean,
) {
  if (!minRegular) return '';
  // not on sale -> keep your existing range html
  if (!onSale || !minSale || minSale <= 0 || minSale >= minRegular) {
    return buildPriceHtmlRange(minRegular, maxRegular || minRegular);
  }

  // on sale -> show regular (range) crossed out, and sale shown
  const regularHtml = buildPriceHtmlRange(minRegular, maxRegular || minRegular);
  const saleHtml = buildPriceHtmlRange(minSale, minSale);

  return `<del>${regularHtml}</del> <ins>${saleHtml}</ins>`;
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

// function computeMinMaxPrices(activeVariants: VariantRow[]) {
//   if (!activeVariants.length) return { min: 0, max: 0 };

//   let min = Infinity;
//   let max = -Infinity;

//   for (const v of activeVariants) {
//     const p = getVariantEffectivePrice(v);
//     if (p < min) min = p;
//     if (p > max) max = p;
//   }

//   if (!Number.isFinite(min)) min = 0;
//   if (!Number.isFinite(max)) max = 0;
//   return { min, max };
// }

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

// 2) Mapper: include stock in variation payload (mapVariantToWooLike)
function mapVariantToWooLike(
  variant: VariantRow & { image?: ProductImageRow | null; stock?: number },
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

  const img = variant.image ?? null;
  const image = img
    ? { id: img.id, src: img.url, alt: img.altText ?? null }
    : null;

  const stock_quantity = Number(variant.stock ?? 0);

  // ✅ Woo-like: if you want FE to enforce qty, set manage_stock true + stock_quantity
  const manage_stock = true;

  // ✅ stock status based on quantity (not price)
  const stock_status: 'instock' | 'outofstock' | 'onbackorder' =
    stock_quantity > 0 ? 'instock' : 'outofstock';

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

  // images (hero first, then rest, dedup, position sort)
  const all = (product.images ?? []).slice().sort((a, b) => {
    const ap = a.position ?? 0;
    const bp = b.position ?? 0;
    return ap - bp;
  });

  const ordered = hero
    ? [hero, ...all.filter((img) => img.id !== hero.id)]
    : all;

  const images = Array.from(
    new Map(ordered.map((i) => [i.id, i])).values(),
  ).map((img: any) => ({
    id: img.id,
    src: img.url,
    alt: img.altText ?? null,
  }));

  // categories (dedup + infer hub + parent->child order)
  const rawCats = (product.productCategories ?? [])
    .map((pc) => pc.category)
    .filter(Boolean) as Array<{
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    isHub?: boolean | null;
  }>;

  const byId = new Map(rawCats.map((c) => [c.id, c]));
  const uniqueCats = Array.from(byId.values());

  const hasAnyChild = new Set<string>();
  for (const c of uniqueCats) {
    if (c.parentId) hasAnyChild.add(c.parentId);
  }

  const catsWithHub = uniqueCats.map((c) => ({
    ...c,
    isHub: typeof c.isHub === 'boolean' ? c.isHub : hasAnyChild.has(c.id),
  }));

  let orderedCats = catsWithHub;
  const childWithParent = catsWithHub.find(
    (c) => c.parentId && byId.has(c.parentId),
  );

  if (childWithParent?.parentId) {
    const parent = byId.get(childWithParent.parentId)!;
    const child = childWithParent;

    const parentWithHub = catsWithHub.find((c) => c.id === parent.id) ?? parent;
    const childWithHub = catsWithHub.find((c) => c.id === child.id) ?? child;

    orderedCats = [
      { ...parentWithHub, isHub: Boolean(parentWithHub.isHub) },
      { ...childWithHub, isHub: Boolean(childWithHub.isHub) },
      ...catsWithHub.filter((c) => c.id !== parent.id && c.id !== child.id),
    ];
  }

  const categories = orderedCats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parentId ?? null,
    isHub: Boolean(c.isHub),
  }));

  const attributes = mapProductAttributes(product);
  const activeVariants = (product.variants ?? []).filter((v) => v.isActive);

  const isVariable =
    attributes.some((a) => a.variation) && activeVariants.length > 0;

  // pricing helpers
  const getVariantRegular = (v: any) => Number(v.regularPrice ?? v.price ?? 0);
  const getVariantSale = (v: any) => Number(v.salePrice ?? 0);

  const isVariantOnSale = (v: any) => {
    const r = getVariantRegular(v);
    const s = getVariantSale(v);
    return s > 0 && r > 0 && s < r;
  };

  const getVariantEffective = (v: any) => {
    const r = getVariantRegular(v);
    const s = getVariantSale(v);
    return isVariantOnSale(v) ? s : r;
  };

  const pricingBase = activeVariants.length ? activeVariants : [];

  const effectivePrices = pricingBase
    .map(getVariantEffective)
    .filter((n) => n > 0);
  const regularPrices = pricingBase.map(getVariantRegular).filter((n) => n > 0);
  const salePrices = pricingBase
    .filter(isVariantOnSale)
    .map(getVariantSale)
    .filter((n) => n > 0);

  const minEffective = effectivePrices.length
    ? Math.min(...effectivePrices)
    : 0;
  const maxEffective = effectivePrices.length
    ? Math.max(...effectivePrices)
    : 0;

  const minRegular = regularPrices.length ? Math.min(...regularPrices) : 0;
  const minSale = salePrices.length ? Math.min(...salePrices) : 0;

  const onSale = pricingBase.some(isVariantOnSale);

  const primaryVariant = activeVariants[0] ?? null;

  const simpleRegular = primaryVariant
    ? getVariantRegular(primaryVariant)
    : minRegular;
  const simpleSale =
    primaryVariant && isVariantOnSale(primaryVariant)
      ? getVariantSale(primaryVariant)
      : 0;
  const simpleOnSale = primaryVariant
    ? isVariantOnSale(primaryVariant)
    : onSale;

  // ✅ variations must include stock_quantity via mapVariantToWooLike
  const variations = activeVariants.map((v) =>
    mapVariantToWooLike(v as any, product),
  );

  // ✅ stock: product-level
  // variable => sum of variant stock
  // simple => primary variant stock
  const totalStock = activeVariants.reduce(
    (sum, v: any) => sum + Number(v.stock ?? 0),
    0,
  );

  const simpleStock = Number((primaryVariant as any)?.stock ?? 0);
  const productStockQty = isVariable ? totalStock : simpleStock;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    permalink: buildPermalink(product.slug),
    moq: (product as any).moq ?? 1,
    type: isVariable ? 'variable' : 'simple',

    price: String(
      isVariable ? minEffective : simpleOnSale ? simpleSale : simpleRegular,
    ),
    regular_price: String(isVariable ? minRegular : simpleRegular),
    sale_price: isVariable
      ? minSale > 0
        ? String(minSale)
        : ''
      : simpleSale > 0
        ? String(simpleSale)
        : '',
    on_sale: Boolean(isVariable ? onSale : simpleOnSale),

    average_rating: Number((product as any).average_rating ?? 0).toFixed(2),
    rating_count: Number((product as any).rating_count ?? 0),

    images,
    tags: [],

    categories,
    attributes,

    description: product.description ?? '',
    short_description: '',

    variations,

    // ✅ stock fields FE can enforce
    manage_stock: true,
    stock_quantity: productStockQty,
    stock_status: productStockQty > 0 ? 'instock' : 'outofstock',

    weight: '',

    price_html: buildPriceHtmlRange(minEffective, maxEffective),

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

    // pricing fields injected from query
    minRegular?: number | null;
    maxRegular?: number | null;
    minSale?: number | null;
    onSale?: boolean | number;
  },
) {
  /* ================= HERO IMAGE ================= */
  const hero =
    product.defaultImage ??
    (product.images && product.images.length ? product.images[0] : null);

  const images = hero
    ? [{ id: hero.id, src: hero.url, alt: hero.altText ?? null }]
    : [];

  /* ================= CATEGORIES ================= */
  const categories = (product.productCategories ?? [])
    .filter((pc) => pc.category)
    .map((pc) => ({
      id: pc.category!.id,
      name: pc.category!.name,
      slug: pc.category!.slug,
    }));

  /* ================= ATTRIBUTES ================= */
  const attributes = mapProductAttributes(product);
  const isVariable = attributes.some((a) => a.variation);

  /* ================= PRICING ================= */
  const minRegular = Number(product.minRegular ?? 0);
  const maxRegular = Number(product.maxRegular ?? minRegular);
  const minSale = Number(product.minSale ?? 0);
  const onSale = Boolean(product.onSale);

  // effective display price
  const minEffective = onSale && minSale > 0 ? minSale : minRegular;
  const maxEffective = maxRegular || minEffective;

  /* ================= RESPONSE ================= */
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    permalink: buildPermalink(product.slug),

    type: isVariable ? 'variable' : 'simple',

    // Woo-like pricing fields (used by cards & details)
    price: String(minEffective),
    regular_price: String(minRegular),
    sale_price: onSale && minSale > 0 ? String(minSale) : '',
    on_sale: onSale,

    average_rating: Number(product.average_rating ?? 0).toFixed(2),
    rating_count: Number(product.rating_count ?? 0),

    images,
    tags: [],

    categories,
    attributes,

    price_html: buildPriceHtmlRange(minEffective, maxEffective),
  };
}
