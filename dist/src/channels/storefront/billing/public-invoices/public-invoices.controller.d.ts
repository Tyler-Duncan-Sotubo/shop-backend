import { PublicInvoicesService } from 'src/domains/billing/public-invoices/public-invoices.service';
export declare class PublicInvoicesController {
    private readonly links;
    constructor(links: PublicInvoicesService);
    getInvoice(token: string): Promise<{
        data: any;
    }>;
    getPdf(token: string): Promise<{
        data: {
            pdfUrl: any;
            fileName: any;
        };
    }>;
}
