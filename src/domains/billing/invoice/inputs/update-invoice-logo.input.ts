export interface UpdateInvoiceLogoInput {
  storeId?: string | null;
  storageKey?: string; // key returned from presign
  url?: string; // url returned from presign
  altText?: string;
}
