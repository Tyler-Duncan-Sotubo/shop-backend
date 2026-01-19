import { db } from 'src/infrastructure/drizzle/types/drizzle';
export declare class ProductsHelpersService {
    private readonly db;
    constructor(db: db);
    assertCompanyExists(companyId: string): Promise<{
        id: string;
        name: string;
        slug: string;
        legalName: string | null;
        country: string | null;
        vatNumber: string | null;
        defaultCurrency: string;
        timezone: string;
        defaultLocale: string;
        billingEmail: string | null;
        billingCustomerId: string | null;
        billingProvider: string | null;
        plan: string;
        companySize: string | null;
        industry: string | null;
        useCase: string | null;
        trialEndsAt: Date | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    findProductByIdOrThrow(companyId: string, productId: string): Promise<{
        [x: string]: any;
    }>;
    ensureSlugUnique(companyId: string, slug: string, excludeId?: string): Promise<void>;
    toSlug(input: string): string;
    sanitizeFileName(name?: string | null): string | null;
    assertS3KeyAllowed(companyId: string, key: string): void;
}
