export interface UpdateInvoiceBrandingInput {
  templateId?: string;
  storeId?: string;
  logoUrl?: string;
  primaryColor?: string;
  supplierName?: string;
  supplierAddress?: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierTaxId?: string;
  bankDetails?: Record<string, any>;
  footerNote?: string;
}
