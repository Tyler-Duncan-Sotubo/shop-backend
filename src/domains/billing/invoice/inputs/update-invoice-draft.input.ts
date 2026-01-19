export interface UpdateInvoiceDraftInput {
  issuedAt?: string | null;
  dueAt?: string | null;
  storeId?: string | null;
  notes?: string | null;
  customerSnapshot?: any;
}
