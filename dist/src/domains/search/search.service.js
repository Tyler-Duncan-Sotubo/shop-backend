"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../infrastructure/drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
let SearchService = class SearchService {
    constructor(db) {
        this.db = db;
    }
    async globalSearch(companyId, q, type = 'all') {
        const pattern = `%${q}%`;
        const ordersQuery = this.db
            .select({
            id: schema_1.orders.id,
            number: schema_1.orders.orderNumber,
            customer: (0, drizzle_orm_1.sql) `null`.as('customer'),
            status: schema_1.orders.status,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.ilike)(schema_1.orders.orderNumber, pattern)))
            .limit(5);
        const invoicesQuery = this.db
            .select({
            id: schema_1.invoices.id,
            number: schema_1.invoices.number,
            customer: (0, drizzle_orm_1.sql) `${schema_1.invoices.customerSnapshot}->>'name'`.as('customer'),
            status: schema_1.invoices.status,
        })
            .from(schema_1.invoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.invoices.number, pattern), (0, drizzle_orm_1.sql) `${schema_1.invoices.customerSnapshot}->>'name' ilike ${pattern}`, (0, drizzle_orm_1.sql) `${schema_1.invoices.customerSnapshot}->>'email' ilike ${pattern}`)))
            .limit(5);
        const quotesQuery = this.db
            .select({
            id: schema_1.quoteRequests.id,
            number: schema_1.quoteRequests.quoteNumber,
            customer: schema_1.quoteRequests.customerName,
            status: schema_1.quoteRequests.status,
        })
            .from(schema_1.quoteRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.quoteRequests.quoteNumber, pattern), (0, drizzle_orm_1.ilike)(schema_1.quoteRequests.customerName, pattern), (0, drizzle_orm_1.ilike)(schema_1.quoteRequests.customerEmail, pattern))))
            .limit(5);
        const customersQuery = this.db
            .select({
            id: schema_1.customers.id,
            number: (0, drizzle_orm_1.sql) `null`.as('number'),
            customer: schema_1.customers.firstName,
            status: (0, drizzle_orm_1.sql) `null`.as('status'),
            email: schema_1.customers.billingEmail,
        })
            .from(schema_1.customers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.companyId, companyId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.customers.firstName, pattern), (0, drizzle_orm_1.ilike)(schema_1.customers.billingEmail, pattern))))
            .limit(5);
        if (type === 'orders') {
            return {
                orders: await ordersQuery,
                invoices: [],
                quotes: [],
                customers: [],
            };
        }
        if (type === 'invoices') {
            return {
                orders: [],
                invoices: await invoicesQuery,
                quotes: [],
                customers: [],
            };
        }
        if (type === 'quotes') {
            return {
                orders: [],
                invoices: [],
                quotes: await quotesQuery,
                customers: [],
            };
        }
        if (type === 'customers') {
            return {
                orders: [],
                invoices: [],
                quotes: [],
                customers: await customersQuery,
            };
        }
        const [orderRows, invoiceRows, quoteRows, customerRows] = await Promise.all([ordersQuery, invoicesQuery, quotesQuery, customersQuery]);
        return {
            orders: orderRows,
            invoices: invoiceRows,
            quotes: quoteRows,
            customers: customerRows,
        };
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], SearchService);
//# sourceMappingURL=search.service.js.map