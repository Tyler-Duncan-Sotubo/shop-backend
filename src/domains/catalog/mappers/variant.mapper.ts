import { productVariants } from 'src/infrastructure/drizzle/schema';
import { getEffectivePrice } from '../utils/pricing';

export type VariantRow = typeof productVariants.$inferSelect;

export interface VariantImageResponse {
  id: string;
  url: string;
  altText?: string | null;
  position?: number | null;
}

export interface inventoryItemsResponse {
  stockQuantity: number | null;
  lowStockThreshold: number | null;
}

export interface VariantResponse {
  id: string;
  variantId: number;
  productId: string;
  title: string | null;

  sku: string | null;
  barcode: string | null;

  option1: string | null;
  option2: string | null;
  option3: string | null;

  isActive: boolean;

  regularPrice: number;
  salePrice: number | null;
  effectivePrice: number;
  currency: string;

  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;

  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface VariantResponseWithImage extends VariantResponse {
  image: VariantImageResponse | null;
  inventory: inventoryItemsResponse | null;
}

export function mapVariantToResponse(row: VariantRow): VariantResponse {
  return {
    id: row.id,
    variantId: row.varId,
    productId: row.productId,
    title: row.title,

    sku: row.sku,
    barcode: row.barcode,

    option1: row.option1,
    option2: row.option2,
    option3: row.option3,

    isActive: row.isActive,

    regularPrice: Number(row.regularPrice),
    salePrice: row.salePrice ? Number(row.salePrice) : null,
    effectivePrice: getEffectivePrice({
      regularPrice: row.regularPrice,
      salePrice: row.salePrice,
      saleStartAt: null,
      saleEndAt: null,
    }),

    currency: row.currency,

    weight: row.weight ? Number(row.weight) : null,
    length: row.length ? Number(row.length) : null,
    width: row.width ? Number(row.width) : null,
    height: row.height ? Number(row.height) : null,

    metadata: row.metadata ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapVariantToResponseWithImage(
  row: VariantRow,
  image: VariantImageResponse | null,
  inventory: inventoryItemsResponse | null,
): VariantResponseWithImage {
  return {
    ...mapVariantToResponse(row),
    image,
    inventory,
  };
}
