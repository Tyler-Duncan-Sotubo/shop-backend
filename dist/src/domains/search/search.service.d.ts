import { db } from "../../infrastructure/drizzle/types/drizzle";
export declare class SearchService {
    private readonly db;
    constructor(db: db);
    globalSearch(companyId: string, q: string, type?: 'all' | 'orders' | 'invoices' | 'quotes' | 'customers'): Promise<{
        orders: ({
            id: any;
            number: any;
            customer: any;
            status: any;
        } | {
            id: any;
            number: any;
            customer: any;
            status: any;
        })[];
        invoices: {
            id: string;
            number: string | null;
            customer: any;
            status: "draft" | "issued" | "partially_paid" | "paid" | "void";
        }[];
        quotes: {
            id: string;
            number: string | null;
            customer: string | null;
            status: string;
        }[];
        customers: {
            id: string;
            number: any;
            customer: string | null;
            status: any;
            email: string | null;
        }[];
    }>;
}
