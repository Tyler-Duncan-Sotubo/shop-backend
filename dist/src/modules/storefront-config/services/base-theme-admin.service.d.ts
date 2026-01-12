import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { CreateBaseDto, UpdateBaseDto } from '../dto/base-theme.dto';
import { CreateThemeDto, UpdateThemeDto } from '../dto/theme.dto';
export declare class BaseThemeAdminService {
    private readonly db;
    private readonly cache;
    constructor(db: db, cache: CacheService);
    createBase(dto: CreateBaseDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        key: string;
        version: number;
        theme: unknown;
        header: unknown;
        pages: unknown;
        ui: unknown;
        seo: unknown;
        footer: unknown;
    }>;
    listBases(params?: {
        activeOnly?: boolean;
    }): Promise<{
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
    getBaseById(baseId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        key: string;
        version: number;
        theme: unknown;
        header: unknown;
        pages: unknown;
        ui: unknown;
        seo: unknown;
        footer: unknown;
    }>;
    getBaseByKey(key: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        key: string;
        version: number;
        theme: unknown;
        header: unknown;
        pages: unknown;
        ui: unknown;
        seo: unknown;
        footer: unknown;
    }>;
    updateBase(baseId: string, dto: UpdateBaseDto): Promise<{
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
    createTheme(companyId: string, dto: CreateThemeDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        key: string;
        version: number;
        theme: unknown;
        header: unknown;
        pages: unknown;
        ui: unknown;
        seo: unknown;
        footer: unknown;
    }>;
    createGlobalTheme(dto: CreateThemeDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        key: string;
        version: number;
        theme: unknown;
        header: unknown;
        pages: unknown;
        ui: unknown;
        seo: unknown;
        footer: unknown;
    }>;
    listThemes(companyId: string, params?: {
        key?: string;
        activeOnly?: boolean;
        scope?: 'global' | 'company';
    }): Promise<{
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
    getThemeById(companyId: string, themeId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        key: string;
        version: number;
        theme: unknown;
        header: unknown;
        pages: unknown;
        ui: unknown;
        seo: unknown;
        footer: unknown;
    }>;
    updateTheme(companyId: string, themeId: string, dto: UpdateThemeDto): Promise<{
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
    deleteTheme(companyId: string, themeId: string): Promise<{
        ok: boolean;
    }>;
}
