import { NGRegionCode } from 'src/common/utils/ng-region-codes';
export declare class UpdateCustomerAddressAdminDto {
    label?: string;
    firstName?: string;
    lastName?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: NGRegionCode;
    postalCode?: string;
    country?: string;
    phone?: string;
    isDefaultBilling?: boolean;
    isDefaultShipping?: boolean;
}
