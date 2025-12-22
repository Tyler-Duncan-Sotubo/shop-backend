import { NGRegionCode } from 'src/common/geo/ng-region-codes';
export declare class UpsertZoneLocationDto {
    zoneId: string;
    countryCode?: string;
    state?: NGRegionCode;
    area?: string;
}
