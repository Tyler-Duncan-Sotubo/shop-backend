import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { QuoteService } from 'src/domains/commerce/quote/quote.service';
export declare class QuoteController extends BaseController {
    private readonly quoteService;
    constructor(quoteService: QuoteService);
    submitQuoteFromStorefront(storeId: string, dto: CreateQuoteDto, ip: string): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        expiresAt: Date | null;
        storeId: string;
        currency: string | null;
        meta: Record<string, unknown> | null;
        customerEmail: string;
        customerNote: string | null;
        archivedAt: Date | null;
        convertedInvoiceId: string | null;
        convertedOrderId: string | null;
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
        lastSyncedAt: Date | null;
        syncError: string | null;
    }>;
}
