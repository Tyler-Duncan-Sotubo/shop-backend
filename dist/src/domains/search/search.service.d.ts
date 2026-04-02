import { db } from 'src/infrastructure/drizzle/types/drizzle';
export declare class SearchService {
    private readonly db;
    constructor(db: db);
    globalSearch(companyId: string, q: string): Promise<{
        orders: ({
            id: any;
            number: any;
            customer: string;
            status: any;
        } | {
            id: any;
            number: any;
            customer: string;
            status: any;
        })[];
        invoices: {
            id: string;
            number: string | null;
            customer: string;
            status: "draft" | "issued" | "partially_paid" | "paid" | "void";
        }[];
        quotes: {
            id: string;
            number: string | null;
            customer: string | null;
            status: string;
        }[];
    }>;
}
