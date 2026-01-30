export declare class CreateStoreDto {
    name: string;
    storeEmail: string;
    slug: string;
    defaultCurrency?: string;
    defaultLocale?: string;
    isActive?: boolean;
    base64Image?: string;
    imageAltText?: string;
    removeImage?: boolean;
    supportedCurrencies?: string[];
}
