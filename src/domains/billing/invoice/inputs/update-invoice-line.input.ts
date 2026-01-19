export interface UpdateInvoiceLineInput {
  description?: string;
  quantity?: number;
  unitPriceMinor?: number;
  discountMinor?: number;
  taxId?: string;
  taxExempt?: boolean;
  taxExemptReason?: string;
}
