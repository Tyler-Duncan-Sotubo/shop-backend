import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { QuoteService } from 'src/domains/commerce/quote/quote.service';
export declare class QuoteController extends BaseController {
    private readonly quoteService;
    constructor(quoteService: QuoteService);
    submitQuoteFromStorefront(storeId: string, dto: CreateQuoteDto, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        storeId: string;
        status: string;
        currency: string | null;
        expiresAt: Date | null;
        convertedOrderId: string | null;
        quoteNumber: string | null;
        customerEmail: string;
        customerNote: string | null;
        customerName: string | null;
        meta: Record<string, unknown> | null;
        archivedAt: Date | null;
        convertedInvoiceId: string | null;
        createdZohoAt: Date | null;
        sentAt: Date | null;
        acceptedAt: Date | null;
        convertedAt: Date | null;
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
