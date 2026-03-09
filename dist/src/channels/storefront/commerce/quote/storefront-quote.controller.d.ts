import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { QuoteService } from 'src/domains/commerce/quote/quote.service';
export declare class QuoteController extends BaseController {
    private readonly quoteService;
    constructor(quoteService: QuoteService);
    submitQuoteFromStorefront(storeId: string, dto: CreateQuoteDto, ip: string): Promise<{
        id: string;
        quoteNumber: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        storeId: string;
        status: string;
        customerEmail: string;
        customerNote: string | null;
        meta: Record<string, unknown> | null;
        expiresAt: Date | null;
        archivedAt: Date | null;
        convertedInvoiceId: string | null;
        convertedOrderId: string | null;
        createdZohoAt: Date | null;
        sentAt: Date | null;
        acceptedAt: Date | null;
        convertedAt: Date | null;
        currency: string | null;
        totalsSnapshot: {
            subtotal?: number;
            tax?: number;
            shipping?: number;
            discount?: number;
            total?: number;
        } | null;
        zohoContactId: string | null;
        zohoOrganizationId: string | null;
        zohoEstimateId: string | null;
        zohoEstimateNumber: string | null;
        zohoEstimateStatus: string | null;
        lastSyncedAt: Date | null;
        syncError: string | null;
    }>;
}
