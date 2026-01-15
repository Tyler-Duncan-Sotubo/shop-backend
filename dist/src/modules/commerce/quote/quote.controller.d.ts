import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { GetQuotesQueryDto } from './dto/get-quotes-query.dto';
import { ConvertQuoteToManualOrderDto } from './dto/convert-quote-to-manual-order.dto';
export declare class QuoteController extends BaseController {
    private readonly quoteService;
    constructor(quoteService: QuoteService);
    getQuotes(user: User, query: GetQuotesQueryDto): Promise<{
        rows: {
            id: string;
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
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }[];
        count: number;
        limit: number;
        offset: number;
    }>;
    getQuoteById(user: User, quoteId: string): Promise<{
        items: {
            id: string;
            quoteRequestId: string;
            productId: string | null;
            variantId: string | null;
            nameSnapshot: string;
            variantSnapshot: string | null;
            attributes: Record<string, string | null> | null;
            imageUrl: string | null;
            quantity: number;
            position: number;
            createdAt: Date;
            deletedAt: Date | null;
        }[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        storeId: string;
        status: string;
        expiresAt: Date | null;
        meta: Record<string, unknown> | null;
        customerEmail: string;
        customerNote: string | null;
        archivedAt: Date | null;
        convertedInvoiceId: string | null;
        convertedOrderId: string | null;
    }>;
    createQuote(user: User, dto: CreateQuoteDto, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        storeId: string;
        status: string;
        expiresAt: Date | null;
        meta: Record<string, unknown> | null;
        customerEmail: string;
        customerNote: string | null;
        archivedAt: Date | null;
        convertedInvoiceId: string | null;
        convertedOrderId: string | null;
    }>;
    updateQuote(user: User, quoteId: string, dto: UpdateQuoteDto, ip: string): Promise<{
        id: string;
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
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    convertQuoteToOrder(user: User, quoteId: string, dto: ConvertQuoteToManualOrderDto, ip: string): Promise<{
        orderId: any;
    }>;
    deleteQuote(user: User, quoteId: string, ip: string): Promise<{
        success: boolean;
    }>;
    submitQuoteFromStorefront(storeId: string, dto: CreateQuoteDto, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        storeId: string;
        status: string;
        expiresAt: Date | null;
        meta: Record<string, unknown> | null;
        customerEmail: string;
        customerNote: string | null;
        archivedAt: Date | null;
        convertedInvoiceId: string | null;
        convertedOrderId: string | null;
    }>;
}
