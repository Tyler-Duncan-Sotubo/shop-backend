import { User } from "../common/types/user.type";
import { SetupCreateStoreAndDomainDto } from './dto/setup-store.dto';
import { SetupService } from "../../../domains/setup/setup.service";
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
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            defaultCurrency: string;
            defaultLocale: string;
            isActive: boolean;
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
            createdAt: Date;
            updatedAt: Date;
            country: string | null;
            isActive: boolean;
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
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            storeId: string;
            status: "draft" | "published";
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
