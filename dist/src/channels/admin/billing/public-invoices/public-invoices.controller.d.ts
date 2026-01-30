import { User } from 'src/channels/admin/common/types/user.type';
import { PublicInvoicesService } from 'src/domains/billing/public-invoices/public-invoices.service';
export declare class PublicInvoicesController {
    private readonly links;
    constructor(links: PublicInvoicesService);
    createOrGet(user: User, invoiceId: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            expiresAt: Date | null;
            meta: unknown;
            token: string;
            invoiceId: string;
            enabled: boolean;
            viewCount: number;
            lastViewedAt: Date | null;
            createdBy: string;
        };
    }>;
    revoke(user: User, invoiceId: string): Promise<{
        data: {
            id: string;
            companyId: string;
            invoiceId: string;
            token: string;
            enabled: boolean;
            expiresAt: Date | null;
            viewCount: number;
            lastViewedAt: Date | null;
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
            meta: unknown;
        };
    }>;
    rotate(user: User, invoiceId: string): Promise<{
        data: {
            id: string;
            companyId: string;
            invoiceId: string;
            token: string;
            enabled: boolean;
            expiresAt: Date | null;
            viewCount: number;
            lastViewedAt: Date | null;
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
            meta: unknown;
        };
    }>;
}
