import { z } from 'zod';
export declare const StorefrontConfigV1Schema: z.ZodObject<{
    version: z.ZodLiteral<1>;
    store: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        locale: z.ZodOptional<z.ZodString>;
        currency: z.ZodOptional<z.ZodObject<{
            code: z.ZodString;
            locale: z.ZodString;
            fractionDigits: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            code: string;
            locale: string;
            fractionDigits: number;
        }, {
            code: string;
            locale: string;
            fractionDigits: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        currency?: {
            code: string;
            locale: string;
            fractionDigits: number;
        } | undefined;
        locale?: string | undefined;
    }, {
        id: string;
        name: string;
        currency?: {
            code: string;
            locale: string;
            fractionDigits: number;
        } | undefined;
        locale?: string | undefined;
    }>;
    theme: z.ZodOptional<z.ZodUnknown>;
    seo: z.ZodOptional<z.ZodUnknown>;
    ui: z.ZodOptional<z.ZodUnknown>;
    header: z.ZodUnknown;
    footer: z.ZodOptional<z.ZodUnknown>;
    pages: z.ZodOptional<z.ZodObject<{
        home: z.ZodOptional<z.ZodUnknown>;
        about: z.ZodOptional<z.ZodUnknown>;
        contact: z.ZodOptional<z.ZodUnknown>;
        catalogue: z.ZodOptional<z.ZodUnknown>;
        blog: z.ZodOptional<z.ZodUnknown>;
        account: z.ZodOptional<z.ZodUnknown>;
        collections: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        collections?: unknown;
        blog?: unknown;
        home?: unknown;
        about?: unknown;
        contact?: unknown;
        catalogue?: unknown;
        account?: unknown;
    }, {
        collections?: unknown;
        blog?: unknown;
        home?: unknown;
        about?: unknown;
        contact?: unknown;
        catalogue?: unknown;
        account?: unknown;
    }>>;
}, "strip", z.ZodTypeAny, {
    version: 1;
    store: {
        id: string;
        name: string;
        currency?: {
            code: string;
            locale: string;
            fractionDigits: number;
        } | undefined;
        locale?: string | undefined;
    };
    theme?: unknown;
    header?: unknown;
    pages?: {
        collections?: unknown;
        blog?: unknown;
        home?: unknown;
        about?: unknown;
        contact?: unknown;
        catalogue?: unknown;
        account?: unknown;
    } | undefined;
    ui?: unknown;
    seo?: unknown;
    footer?: unknown;
}, {
    version: 1;
    store: {
        id: string;
        name: string;
        currency?: {
            code: string;
            locale: string;
            fractionDigits: number;
        } | undefined;
        locale?: string | undefined;
    };
    theme?: unknown;
    header?: unknown;
    pages?: {
        collections?: unknown;
        blog?: unknown;
        home?: unknown;
        about?: unknown;
        contact?: unknown;
        catalogue?: unknown;
        account?: unknown;
    } | undefined;
    ui?: unknown;
    seo?: unknown;
    footer?: unknown;
}>;
export declare const storefrontBaseSchemaV1: z.ZodObject<{
    key: z.ZodString;
    version: z.ZodNumber;
    theme: z.ZodUnknown;
    ui: z.ZodUnknown;
    seo: z.ZodUnknown;
    header: z.ZodUnknown;
    footer: z.ZodUnknown;
    pages: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    version: number;
    key: string;
    theme?: unknown;
    header?: unknown;
    pages?: unknown;
    ui?: unknown;
    seo?: unknown;
    footer?: unknown;
}, {
    version: number;
    key: string;
    theme?: unknown;
    header?: unknown;
    pages?: unknown;
    ui?: unknown;
    seo?: unknown;
    footer?: unknown;
}>;
export declare const storefrontThemeSchemaV1: z.ZodObject<{
    key: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
    companyId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    theme: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    ui: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    seo: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    header: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    footer: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    pages: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    isActive: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    version: number;
    isActive: boolean;
    key: string;
    theme: Record<string, any>;
    header: Record<string, any>;
    pages: Record<string, any>;
    ui: Record<string, any>;
    seo: Record<string, any>;
    footer: Record<string, any>;
    companyId?: string | null | undefined;
}, {
    key: string;
    version?: number | undefined;
    isActive?: boolean | undefined;
    companyId?: string | null | undefined;
    theme?: Record<string, any> | undefined;
    header?: Record<string, any> | undefined;
    pages?: Record<string, any> | undefined;
    ui?: Record<string, any> | undefined;
    seo?: Record<string, any> | undefined;
    footer?: Record<string, any> | undefined;
}>;
