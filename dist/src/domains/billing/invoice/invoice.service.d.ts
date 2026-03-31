import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import { InvoiceTotalsService } from './invoice-totals.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { CreateInvoiceFromOrderInput } from './inputs/create-invoice-from-order.input';
import { ListInvoicesQueryInput } from './inputs/list-invoices.query.input';
import { UpdateInvoiceLineInput } from './inputs/update-invoice-line.input';
import { User } from 'src/channels/admin/common/types/user.type';
import { ZohoInvoicesService } from 'src/domains/integration/zoho/zoho-invoices.service';
type TxOrDb = DbType | any;
export declare class InvoiceService {
    private readonly db;
    private readonly totals;
    private readonly auditService;
    private readonly cache;
    private readonly zohoInvoices;
    constructor(db: DbType, totals: InvoiceTotalsService, auditService: AuditService, cache: CacheService, zohoInvoices: ZohoInvoicesService);
    createDraftFromOrder(params: CreateInvoiceFromOrderInput, companyId: string, ctx?: {
        tx?: TxOrDb;
        skipItemsCheck?: boolean;
    }): Promise<any>;
    syncFromOrder(orderId: string, companyId: string, ctx?: {
        tx?: TxOrDb;
    }): Promise<any>;
    recalculateDraftTotals(companyId: string, invoiceId: string, ctx?: {
        tx?: TxOrDb;
    }): Promise<any>;
    issueInvoice(invoiceId: string, dto: any, companyId: string, userId?: string, ctx?: {
        tx?: TxOrDb;
    }, opts?: {
        zohoCustomer?: {
            email: string;
            name?: string | null;
            companyName?: string | null;
        };
        actor?: any;
        ip?: string;
        autoSyncZoho?: boolean;
    }): Promise<any>;
    getInvoiceWithLines(companyId: string, invoiceId: string): Promise<{
        invoice: {
            id: string;
            companyId: string;
            storeId: string | null;
            orderId: string | null;
            quoteRequestId: string | null;
            type: "invoice" | "credit_note";
            status: "draft" | "issued" | "partially_paid" | "paid" | "void";
            customerId: string | null;
            billingAddressId: string | null;
            shippingAddressId: string | null;
            customerSnapshot: unknown;
            supplierSnapshot: unknown;
            seriesId: string | null;
            sequenceNumber: number | null;
            number: string | null;
            issuedAt: Date | null;
            dueAt: Date | null;
            currency: string;
            exchangeRate: string | null;
            subtotalMinor: number;
            discountMinor: number;
            shippingMinor: number;
            taxMinor: number;
            adjustmentMinor: number;
            roundingMinor: number;
            totalMinor: number;
            paidMinor: number;
            balanceMinor: number;
            lockedAt: Date | null;
            voidedAt: Date | null;
            voidReason: string | null;
            meta: unknown;
            zohoOrganizationId: string | null;
            zohoContactId: string | null;
            zohoEstimateId: string | null;
            zohoEstimateNumber: string | null;
            zohoEstimateStatus: string | null;
            zohoInvoiceId: string | null;
            zohoInvoiceNumber: string | null;
            zohoInvoiceStatus: string | null;
            zohoSyncedAt: Date | null;
            zohoSyncError: string | null;
            zohoSentAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
        lines: {
            id: string;
            companyId: string;
            invoiceId: string;
            productId: string | null;
            variantId: string | null;
            orderId: string | null;
            position: number;
            description: string;
            quantity: number;
            unitPriceMinor: number;
            discountMinor: number;
            lineNetMinor: number;
            taxId: string | null;
            taxName: string | null;
            taxRateBps: number;
            taxInclusive: boolean;
            taxExempt: boolean;
            taxExemptReason: string | null;
            taxMinor: number;
            lineTotalMinor: number;
            meta: unknown;
        }[];
    }>;
    listInvoices(companyId: string, opts: ListInvoicesQueryInput): Promise<{
        id: string;
        type: "invoice" | "credit_note";
        number: string | null;
        status: "draft" | "issued" | "partially_paid" | "paid" | "void";
        currency: string;
        subtotalMinor: number;
        taxMinor: number;
        totalMinor: number;
        paidMinor: number;
        balanceMinor: number;
        orderId: string | null;
        storeId: string | null;
        issuedAt: Date | null;
        dueAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        meta: unknown;
        customerSnapshot: unknown;
    }[]>;
    updateDraftLineAndRecalculate(companyId: string, invoiceId: string, lineId: string, dto: UpdateInvoiceLineInput, audit?: {
        userId?: string;
        ip?: string;
    }): Promise<{
        invoice: {
            id: string;
            companyId: string;
            storeId: string | null;
            orderId: string | null;
            quoteRequestId: string | null;
            type: "invoice" | "credit_note";
            status: "draft" | "issued" | "partially_paid" | "paid" | "void";
            customerId: string | null;
            billingAddressId: string | null;
            shippingAddressId: string | null;
            customerSnapshot: unknown;
            supplierSnapshot: unknown;
            seriesId: string | null;
            sequenceNumber: number | null;
            number: string | null;
            issuedAt: Date | null;
            dueAt: Date | null;
            currency: string;
            exchangeRate: string | null;
            subtotalMinor: number;
            discountMinor: number;
            shippingMinor: number;
            taxMinor: number;
            adjustmentMinor: number;
            roundingMinor: number;
            totalMinor: number;
            paidMinor: number;
            balanceMinor: number;
            lockedAt: Date | null;
            voidedAt: Date | null;
            voidReason: string | null;
            meta: unknown;
            zohoOrganizationId: string | null;
            zohoContactId: string | null;
            zohoEstimateId: string | null;
            zohoEstimateNumber: string | null;
            zohoEstimateStatus: string | null;
            zohoInvoiceId: string | null;
            zohoInvoiceNumber: string | null;
            zohoInvoiceStatus: string | null;
            zohoSyncedAt: Date | null;
            zohoSyncError: string | null;
            zohoSentAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
        lines: {
            id: string;
            companyId: string;
            invoiceId: string;
            productId: string | null;
            variantId: string | null;
            orderId: string | null;
            position: number;
            description: string;
            quantity: number;
            unitPriceMinor: number;
            discountMinor: number;
            lineNetMinor: number;
            taxId: string | null;
            taxName: string | null;
            taxRateBps: number;
            taxInclusive: boolean;
            taxExempt: boolean;
            taxExemptReason: string | null;
            taxMinor: number;
            lineTotalMinor: number;
            meta: unknown;
        }[];
    }>;
    private formatInvoiceNumber;
    updateDraftInvoice(companyId: string, invoiceId: string, dto: any, audit?: {
        userId?: string;
        ip?: string;
    }, ctx?: {
        tx?: TxOrDb;
    }): Promise<any>;
    seedDefaultInvoiceSeriesForCompany(companyId: string): Promise<{
        created: boolean;
        id: string;
    }>;
    syncToZoho(companyId: string, invoiceId: string, actor?: User, ip?: string, input?: {
        customer?: {
            email: string;
            name?: string | null;
            companyName?: string | null;
        };
        softFailMissingCustomer?: boolean;
    }, ctx?: {
        tx?: TxOrDb;
    }): Promise<{
        ok: false;
        reason: "missing_customer_details";
        message: string;
        created?: undefined;
        zohoInvoiceId?: undefined;
        zohoInvoiceNumber?: undefined;
        zohoInvoiceStatus?: undefined;
    } | {
        ok: true;
        created: boolean;
        zohoInvoiceId: string;
        zohoInvoiceNumber: string | null;
        zohoInvoiceStatus: string | null;
        reason?: undefined;
        message?: undefined;
    }>;
}
export {};
