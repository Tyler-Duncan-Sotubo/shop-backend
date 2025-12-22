declare class TransferItemInput {
    productVariantId: string;
    quantity: number;
}
export declare class CreateTransferDto {
    fromLocationId: string;
    toLocationId: string;
    reference?: string;
    notes?: string;
    items: TransferItemInput[];
}
export {};
