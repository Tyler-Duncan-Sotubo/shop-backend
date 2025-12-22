export type CompanySettingValue = string | number | boolean | null | string[] | number[] | Record<string, unknown> | Record<string, unknown>[];
export interface CompanySettingSeed {
    key: string;
    value: CompanySettingValue;
}
