import { SearchService } from 'src/domains/search/search.service';
import { User } from '../common/types/user.type';
export declare class SearchController {
    private readonly searchService;
    constructor(searchService: SearchService);
    globalSearch(q: string, user: User): Promise<{
        data: {
            orders: never[];
            invoices: never[];
            quotes: never[];
        };
    } | {
        data: {
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
            customers: {
                id: string;
                number: string;
                customer: string | null;
                status: string;
                email: string | null;
            }[];
        };
    }>;
}
