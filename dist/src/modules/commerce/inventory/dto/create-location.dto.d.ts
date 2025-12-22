import { NGRegionCode } from 'src/common/geo/ng-region-codes';
export declare class CreateLocationDto {
    storeId: string;
    name: string;
    code?: string;
    type: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    region?: NGRegionCode;
    postalCode?: string;
    country?: string;
    isActive?: boolean;
    isDefault?: boolean;
}
