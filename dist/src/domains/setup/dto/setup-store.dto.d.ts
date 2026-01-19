export declare class SetupDomainDto {
    domain: string;
    isPrimary?: boolean;
}
export declare class SetupCreateStoreAndDomainDto {
    name: string;
    slug: string;
    defaultCurrency?: string;
    defaultLocale?: string;
    isActive?: boolean;
    domains: SetupDomainDto[];
    companySize?: string;
    industry?: string;
    useCase?: string;
    supportedCurrencies?: string[];
}
