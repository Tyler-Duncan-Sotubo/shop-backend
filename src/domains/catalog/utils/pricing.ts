// src/modules/catalog/utils/pricing.ts

export interface PriceFields {
  regularPrice: string | number | null;
  salePrice?: string | number | null;
  saleStartAt?: Date | null;
  saleEndAt?: Date | null;
}

/**
 * Determine whether a sale price is currently valid.
 */
export function isSaleActive(variant: PriceFields): boolean {
  if (!variant.salePrice) return false;
  if (!variant.regularPrice) return false;

  const salePrice = Number(variant.salePrice);
  const regularPrice = Number(variant.regularPrice);

  // Sale cannot be equal or higher than regular price
  if (salePrice >= regularPrice) return false;

  const now = new Date();

  if (variant.saleStartAt && now < variant.saleStartAt) {
    return false;
  }

  if (variant.saleEndAt && now > variant.saleEndAt) {
    return false;
  }

  return true;
}

/**
 * Compute the effective price:
 * - If sale price exists and is active → return sale price
 * - Otherwise → return regular price
 */
export function getEffectivePrice(variant: PriceFields): number {
  if (isSaleActive(variant)) {
    return Number(variant.salePrice);
  }

  return Number(variant.regularPrice ?? 0);
}
