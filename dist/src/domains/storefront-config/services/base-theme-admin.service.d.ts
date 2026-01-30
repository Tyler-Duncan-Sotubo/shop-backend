import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
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
        ui: unknown;
        seo: unknown;
        header: unknown;
        footer: unknown;
        pages: unknown;
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
        ui: unknown;
        seo: unknown;
        header: unknown;
        footer: unknown;
        pages: unknown;
    }>;
    getBaseByKey(key: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        key: string;
        version: number;
        theme: unknown;
        ui: unknown;
        seo: unknown;
        header: unknown;
        footer: unknown;
        pages: unknown;
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
        ui: unknown;
        seo: unknown;
        header: unknown;
        footer: unknown;
        pages: unknown;
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
        ui: unknown;
        seo: unknown;
        header: unknown;
        footer: unknown;
        pages: unknown;
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
        ui: unknown;
        seo: unknown;
        header: unknown;
        footer: unknown;
        pages: unknown;
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
