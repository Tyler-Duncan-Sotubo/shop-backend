import { User } from 'src/channels/admin/common/types/user.type';
import { SetupCreateStoreAndDomainDto } from './dto/setup-store.dto';
import { SetupService } from 'src/domains/setup/setup.service';
export declare class SetupController {
    private readonly setupService;
    constructor(setupService: SetupService);
    createStoreWithDomains(user: User, dto: SetupCreateStoreAndDomainDto): Promise<{
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
            storeEmail: string | null;
            supportedCurrencies: string[] | null;
        };
        warehouse: {
            id: string;
            name: string;
            country: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            companyId: string;
            storeId: string;
            type: string;
            city: string | null;
            postalCode: string | null;
            code: string | null;
            isDefault: boolean;
            addressLine1: string | null;
            addressLine2: string | null;
            region: string | null;
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
    markSetupCompleted(user: User): Promise<{
        ok: boolean;
        alreadyCompleted: boolean;
    }>;
}
