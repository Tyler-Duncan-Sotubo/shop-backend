import { User } from 'src/common/types/user.type';
import { SetupService } from './setup.service';
import { SetupCreateStoreAndDomainDto } from './dto/setup-store.dto';
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
    markSetupCompleted(user: User): Promise<{
        ok: boolean;
        alreadyCompleted: boolean;
    }>;
}
