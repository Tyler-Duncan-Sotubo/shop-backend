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
        expiresAt: Date | null;
        storeId: string;
        status: string;
        convertedOrderId: string | null;
        customerEmail: string;
        customerNote: string | null;
        meta: Record<string, unknown> | null;
        archivedAt: Date | null;
        convertedInvoiceId: string | null;
    }>;
}
