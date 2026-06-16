export type POSVariant = {
    id: string;
    title: string | null;
    sku: string | null;
    barcode: string | null;
    productName: string | null;
    imageUrl: string | null;
    suggestedUnitPrice: number | null;
    available: number;
    label: string;
};
export type POSVariantQuery = {
    storeId: string;
    locationId: string;
    search?: string;
    limit?: number;
    offset?: number;
};
