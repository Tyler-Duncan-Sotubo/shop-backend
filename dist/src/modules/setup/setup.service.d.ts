import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { SetupCreateStoreAndDomainDto } from './dto/setup-store.dto';
export declare class SetupService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    constructor(db: db, cache: CacheService, auditService: AuditService);
    normalizeHost(hostRaw: string): string;
    private ensureSlugUniqueForCompany;
    private normalizeAndValidateDomains;
    private getDefaultBaseId;
    private getDefaultThemeId;
    createStoreWithDomains(companyId: string, input: SetupCreateStoreAndDomainDto, user?: User, ip?: string): Promise<{
        company: {
            id: string;
            name: string;
            plan: string;
            defaultCurrency: string;
            defaultLocale: string;
            timezone: string;
            companySize: string | null;
            industry: string | null;
            useCase: string | null;
            isActive: boolean;
        };
        store: {
            id: string;
            name: string;
            slug: string;
            defaultCurrency: string;
            defaultLocale: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            companyId: string;
            imageUrl: string | null;
            imageAltText: string | null;
            supportedCurrencies: string[] | null;
        };
        domains: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            storeId: string;
            domain: string;
            isPrimary: boolean;
        }[];
        draftOverride: {
            status: "draft" | "published";
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            storeId: string;
            publishedAt: Date | null;
            theme: unknown;
            header: unknown;
            pages: unknown;
            ui: unknown;
            seo: unknown;
            footer: unknown;
            baseId: string;
            themeId: string | null;
        };
    }>;
    markSetupCompleted(userId: string): Promise<{
        ok: boolean;
        alreadyCompleted: boolean;
    }>;
}
