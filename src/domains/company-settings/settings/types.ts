export type CompanySettingValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | Record<string, unknown>
  | Record<string, unknown>[];

export interface CompanySettingSeed {
  key: string; // e.g. "checkout.allow_guest_checkout"
  value: CompanySettingValue;
}
