import { NGRegionCode } from 'src/common/utils/ng-region-codes';
export declare class UpsertZoneLocationDto {
    zoneId: string;
    countryCode?: string;
    state?: NGRegionCode;
    area?: string;
}
