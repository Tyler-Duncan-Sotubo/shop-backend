import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { User } from 'src/channels/admin/common/types/user.type';
import { CreateBaseDto, UpdateBaseDto } from './dto/base-theme.dto';
import { CreateThemeDto, UpdateThemeDto } from './dto/theme.dto';
import { UpsertStorefrontOverrideDto } from './dto/upsert-storefront-override.dto';
import { StorefrontConfigService } from 'src/domains/storefront-config/services/storefront-config.service';
import { BaseThemeAdminService } from 'src/domains/storefront-config/services/base-theme-admin.service';
import { StorefrontOverrideService } from 'src/domains/storefront-config/services/storefront-override.service';
export declare class StorefrontConfigController extends BaseController {
    private readonly runtime;
    private readonly overrides;
    private readonly admin;
    constructor(runtime: StorefrontConfigService, overrides: StorefrontOverrideService, admin: BaseThemeAdminService);
    getAdminResolvedConfig(user: User, storeId: string, mode?: 'draft' | 'published'): Promise<{
        version: number;
        store: {
            id: string;
            name: string;
            locale: any;
            currency: any;
        };
        theme: {};
        ui: {};
        seo: {};
        header: {};
        footer: {};
        pages: {};
    }>;
    getStorePublishedOverride(user: User, storeId: string): Promise<{
        id: string;
        theme: unknown;
        ui: unknown;
        seo: unknown;
        header: unknown;
        footer: unknown;
        pages: unknown;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        storeId: string;
        status: "draft" | "published";
        publishedAt: Date | null;
        baseId: string;
        themeId: string | null;
    } | undefined>;
    upsertStoreOverride(user: User, storeId: string, dto: UpsertStorefrontOverrideDto): Promise<{
        id: string;
        theme: unknown;
        ui: unknown;
        seo: unknown;
        header: unknown;
        footer: unknown;
        pages: unknown;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        storeId: string;
        status: "draft" | "published";
        publishedAt: Date | null;
        baseId: string;
        themeId: string | null;
    }>;
    publishStoreOverride(user: User, storeId: string): Promise<{
        ok: boolean;
    }>;
    createBase(dto: CreateBaseDto): Promise<{
        id: string;
        key: string;
        version: number;
        theme: unknown;
        ui: unknown;
        seo: unknown;
        header: unknown;
        footer: unknown;
        pages: unknown;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    listBases(activeOnly?: string): Promise<{
        id: string;
        key: string;
        version: number;
        theme: unknown;
        ui: unknown;
        seo: unknown;
        header: unknown;
        footer: unknown;
        pages: unknown;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getBase(baseId: string): Promise<{
        id: string;
        key: string;
        version: number;
        theme: unknown;
        ui: unknown;
        seo: unknown;
        header: unknown;
        footer: unknown;
        pages: unknown;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateBase(user: User, baseId: string, dto: UpdateBaseDto): Promise<{
        id: string;
        key: string;
        version: number;
        theme: unknown;
        ui: unknown;
        seo: unknown;
        header: unknown;
        footer: unknown;
        pages: unknown;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteBase(baseId: string): Promise<{
        ok: boolean;
    }>;
    createTheme(user: User, dto: CreateThemeDto): Promise<{
        id: string;
        key: string;
        version: number;
        theme: unknown;
        ui: unknown;
        seo: unknown;
        header: unknown;
        footer: unknown;
        pages: unknown;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
    }>;
    listThemes(user: User, key?: string, storeId?: string, activeOnly?: string, scope?: 'global' | 'company'): Promise<{
        id: string;
        companyId: string | null;
        key: string;
        version: number;
        theme: unknown;
        ui: unknown;
        seo: unknown;
        header: unknown;
        footer: unknown;
        pages: unknown;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getTheme(user: User, themeId: string): Promise<{
        id: string;
        key: string;
        version: number;
        theme: unknown;
        ui: unknown;
        seo: unknown;
        header: unknown;
        footer: unknown;
        pages: unknown;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
    }>;
    updateTheme(user: User, themeId: string, dto: UpdateThemeDto): Promise<{
        id: string;
        companyId: string | null;
        key: string;
        version: number;
        theme: unknown;
        ui: unknown;
        seo: unknown;
        header: unknown;
        footer: unknown;
        pages: unknown;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteTheme(user: User, themeId: string): Promise<{
        ok: boolean;
    }>;
    getStoreThemeStatus(user: User, storeId: string): Promise<{
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
