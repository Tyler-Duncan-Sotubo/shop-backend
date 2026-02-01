import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { UpsertStorefrontOverrideDto } from '../dto/upsert-storefront-override.dto';
import { StorefrontConfigService } from './storefront-config.service';
import { StorefrontRevalidateService } from './storefront-revalidate.service';
import { CompanySettingsService } from 'src/domains/company-settings/company-settings.service';
export declare class StorefrontOverrideService {
    private readonly db;
    private readonly cache;
    private readonly storefrontConfigService;
    private readonly storefrontRevalidateService;
    private readonly companySettings;
    constructor(db: db, cache: CacheService, storefrontConfigService: StorefrontConfigService, storefrontRevalidateService: StorefrontRevalidateService, companySettings: CompanySettingsService);
    private assertStore;
    getPublishedOverride(companyId: string, storeId: string): Promise<{
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
    } | undefined>;
    private validateOverridePayloadOrThrow;
    upsertOverride(companyId: string, storeId: string, dto: UpsertStorefrontOverrideDto): Promise<{
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
    }>;
    publishDraft(companyId: string, storeId: string): Promise<{
        ok: boolean;
    }>;
    getStorefrontOverrideStatus(companyId: string, storeId: string): Promise<{
        storeId: string;
        requireTheme: boolean;
        published: {
            exists: boolean;
            themeId: string | null;
            baseId: string;
            updatedAt: Date;
            createdAt: Date;
        } | {
            exists: boolean;
            themeId: null;
            baseId: null;
            updatedAt: null;
            createdAt: null;
        };
        draft: {
            exists: boolean;
            themeId: string | null;
            baseId: string;
            updatedAt: Date;
            createdAt: Date;
        } | {
            exists: boolean;
            themeId: null;
            baseId: null;
            updatedAt: null;
            createdAt: null;
        };
        isLive: boolean;
        hasDraftChanges: boolean;
        publishedThemeId: string | null;
        draftThemeId: string | null;
    }>;
}
