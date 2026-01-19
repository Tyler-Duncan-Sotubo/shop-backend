export interface UpdateTaxInput {
  storeId?: string;
  name?: string;
  code?: string | null;
  rateBps?: number;
  isInclusive?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
}
