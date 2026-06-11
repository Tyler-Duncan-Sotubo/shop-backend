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
exports.InvoiceService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const invoice_totals_service_1 = require("./invoice-totals.service");
const audit_service_1 = require("../../audit/audit.service");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const zoho_invoices_service_1 = require("../../integration/zoho/zoho-invoices.service");
const zoho_service_1 = require("../../integration/zoho/zoho.service");
let InvoiceService = class InvoiceService {
    constructor(db, totals, auditService, cache, zohoInvoices, zohoService) {
        this.db = db;
        this.totals = totals;
        this.auditService = auditService;
        this.cache = cache;
        this.zohoInvoices = zohoInvoices;
        this.zohoService = zohoService;
    }
    async createDraftFromOrder(params, companyId, ctx) {
        const tx = ctx?.tx ?? this.db;
        const { orderId } = params;
        const type = params.type ?? 'invoice';
        const [ord] = await tx
            .select()
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId)))
            .execute();
        if (!ord)
            throw new common_1.NotFoundException('Order not found');
        const items = await tx
            .select()
            .from(schema_1.orderItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId), (0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId)))
            .execute();
        if (!items.length && !ctx?.skipItemsCheck) {
            throw new common_1.BadRequestException('Order has no items');
        }
        const [existing] = await tx
            .select()
            .from(schema_1.invoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.orderId, orderId), (0, drizzle_orm_1.eq)(schema_1.invoices.type, type)))
            .execute();
        if (existing)
            return existing;
        const currency = params.currency ?? ord.currency ?? 'NGN';
        const orderDiscountMinor = Number(ord?.discountTotalMinor ?? 0) > 0
            ? Number(ord.discountTotalMinor)
            : Math.round(Number(ord?.discountTotal ?? 0) * 100);
        const [inv] = await tx
            .insert(schema_1.invoices)
            .values({
            companyId,
            storeId: params.storeId ?? ord.storeId ?? null,
            orderId,
            type,
            status: 'draft',
            currency,
            subtotalMinor: 0,
            discountMinor: orderDiscountMinor,
            taxMinor: 0,
            totalMinor: 0,
            paidMinor: 0,
            balanceMinor: 0,
            meta: {
                createdFrom: 'order',
                orderNumber: ord.orderNumber ?? null,
                fulfillmentType: ord.fulfillmentType ?? null,
                shippingMethod: ord.shippingMethod ?? null,
                shippingMethodMeta: ord.shippingMethodMeta ?? null,
            },
        })
            .returning()
            .execute();
        const parseNumeric = (v) => Number(typeof v === 'string' ? v : (v ?? 0));
        const toMinorFromMajor = (major) => Math.round(parseNumeric(major) * 100);
        const pickMinor = (minor, major) => {
            const m = Number(minor ?? 0);
            if (m > 0)
                return m;
            return toMinorFromMajor(major);
        };
        const lineRows = items.map((it, idx) => {
            const quantity = Number(it.quantity ?? 1);
            const unitPriceMinor = pickMinor(it.unitPriceMinor, it.unitPrice);
            const discountMinor = 0;
            const lineNetMinor = unitPriceMinor * quantity - discountMinor;
            return {
                companyId,
                invoiceId: inv.id,
                orderId,
                position: idx,
                productId: it.productId ?? null,
                variantId: it.variantId ?? null,
                description: it.name ?? 'Item',
                quantity,
                unitPriceMinor,
                discountMinor,
                lineNetMinor,
                taxMinor: 0,
                lineTotalMinor: lineNetMinor,
                taxId: null,
                taxName: null,
                taxRateBps: 0,
                taxInclusive: false,
                taxExempt: false,
                taxExemptReason: null,
                meta: {
                    source: 'order',
                    orderItemId: it.id ?? null,
                    sku: it.sku ?? null,
                    attributes: it.attributes ?? null,
                },
            };
        });
        const shippingFeeMinor = Number(ord.shippingTotalMinor ?? 0);
        if (shippingFeeMinor > 0) {
            const shippingName = ord.shippingMethodMeta?.rate?.name ??
                ord.shippingMethod ??
                'Shipping';
            lineRows.push({
                companyId,
                invoiceId: inv.id,
                orderId,
                position: lineRows.length,
                productId: null,
                variantId: null,
                description: shippingName,
                quantity: 1,
                unitPriceMinor: shippingFeeMinor,
                discountMinor: 0,
                lineNetMinor: shippingFeeMinor,
                taxMinor: 0,
                lineTotalMinor: shippingFeeMinor,
                taxId: null,
                taxName: null,
                taxRateBps: 0,
                taxInclusive: false,
                taxExempt: false,
                taxExemptReason: null,
                meta: {
                    kind: 'shipping',
                    source: 'order',
                    fulfillmentType: ord.fulfillmentType ?? 'delivery',
                    method: ord.shippingMethod ?? null,
                    rateSnapshot: ord.shippingMethodMeta ?? null,
                },
            });
        }
        await tx.insert(schema_1.invoiceLines).values(lineRows).execute();
        await this.recalculateDraftTotals(companyId, inv.id, { tx });
        return inv;
    }
    async syncFromOrder(orderId, companyId, ctx) {
        const tx = ctx?.tx ?? this.db;
        const [invoice] = await tx
            .select()
            .from(schema_1.invoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.orderId, orderId), (0, drizzle_orm_1.eq)(schema_1.invoices.status, 'draft')))
            .execute();
        if (!invoice)
            return null;
        const [ord] = await tx
            .select()
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
            .execute();
        if (!ord)
            return null;
        const orderDiscountMinor = Number(ord?.discountTotalMinor ?? 0) > 0
            ? Number(ord.discountTotalMinor)
            : Math.round(Number(ord?.discountTotal ?? 0) * 100);
        const shippingFeeMinor = Number(ord?.shippingTotalMinor ?? 0) > 0
            ? Number(ord.shippingTotalMinor)
            : Math.round(Number(ord?.shippingTotal ?? 0) * 100);
        const shippingName = ord?.shippingMethodMeta?.rate?.name ??
            ord?.shippingMethod ??
            'Shipping';
        await tx
            .update(schema_1.invoices)
            .set({ discountMinor: orderDiscountMinor, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.invoices.id, invoice.id))
            .execute();
        const items = await tx
            .select()
            .from(schema_1.orderItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)))
            .execute();
        await tx
            .delete(schema_1.invoiceLines)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceLines.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoiceLines.invoiceId, invoice.id)))
            .execute();
        if (!items.length && shippingFeeMinor === 0) {
            await tx
                .update(schema_1.invoices)
                .set({
                subtotalMinor: 0,
                discountMinor: orderDiscountMinor,
                taxMinor: 0,
                totalMinor: 0,
                balanceMinor: 0,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.invoices.id, invoice.id))
                .execute();
            return invoice;
        }
        const parseNumeric = (v) => Number(typeof v === 'string' ? v : (v ?? 0));
        const toMinorFromMajor = (major) => Math.round(parseNumeric(major) * 100);
        const pickMinor = (minor, major) => {
            const m = Number(minor ?? 0);
            if (m > 0)
                return m;
            return toMinorFromMajor(major);
        };
        const lineRows = items.map((item, idx) => {
            const quantity = Number(item.quantity ?? 1);
            const unitPriceMinor = pickMinor(item.unitPriceMinor, item.unitPrice);
            const lineNetMinor = unitPriceMinor * quantity;
            return {
                companyId,
                invoiceId: invoice.id,
                orderId,
                position: idx,
                productId: item.productId ?? null,
                variantId: item.variantId ?? null,
                description: item.name ?? 'Item',
                quantity,
                unitPriceMinor,
                discountMinor: 0,
                lineNetMinor,
                taxMinor: 0,
                lineTotalMinor: lineNetMinor,
                taxId: null,
                taxName: null,
                taxRateBps: 0,
                taxInclusive: false,
                taxExempt: false,
                taxExemptReason: null,
                meta: {
                    source: 'order',
                    orderItemId: item.id ?? null,
                    sku: item.sku ?? null,
                    attributes: item.attributes ?? null,
                },
            };
        });
        if (shippingFeeMinor > 0) {
            lineRows.push({
                companyId,
                invoiceId: invoice.id,
                orderId,
                position: items.length,
                productId: null,
                variantId: null,
                description: shippingName,
                quantity: 1,
                unitPriceMinor: shippingFeeMinor,
                discountMinor: 0,
                lineNetMinor: shippingFeeMinor,
                taxMinor: 0,
                lineTotalMinor: shippingFeeMinor,
                taxId: null,
                taxName: null,
                taxRateBps: 0,
                taxInclusive: false,
                taxExempt: false,
                taxExemptReason: null,
                meta: {
                    kind: 'shipping',
                    source: 'order',
                    fulfillmentType: ord?.fulfillmentType ?? 'delivery',
                    method: ord?.shippingMethod ?? null,
                    rateSnapshot: ord?.shippingMethodMeta ?? null,
                },
            });
        }
        if (lineRows.length) {
            await tx
                .insert(schema_1.invoiceLines)
                .values(lineRows)
                .execute();
        }
        await this.recalculateDraftTotals(companyId, invoice.id, { tx });
        return invoice;
    }
    async recalculateDraftTotals(companyId, invoiceId, ctx) {
        const tx = ctx?.tx ?? this.db;
        const [inv] = await tx
            .select()
            .from(schema_1.invoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId)))
            .execute();
        if (!inv)
            throw new common_1.NotFoundException('Invoice not found');
        if (inv.status !== 'draft')
            return inv;
        const orderDiscountMinor = Number(inv.discountMinor ?? 0);
        const lines = await tx
            .select()
            .from(schema_1.invoiceLines)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceLines.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoiceLines.invoiceId, invoiceId)))
            .execute();
        if (!lines.length)
            throw new common_1.BadRequestException('Invoice has no lines');
        const taxIds = Array.from(new Set(lines.map((l) => l.taxId).filter(Boolean)));
        const taxMap = new Map();
        if (taxIds.length) {
            const taxRows = await tx
                .select()
                .from(schema_1.taxes)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.taxes.id, taxIds)))
                .execute();
            for (const t of taxRows)
                taxMap.set(t.id, t);
        }
        for (const l of lines) {
            const isShipping = l.meta?.kind === 'shipping';
            const t = !isShipping && l.taxId ? taxMap.get(l.taxId) : null;
            const calc = this.totals.calcLine({
                quantity: Number(l.quantity),
                unitPriceMinor: Number(l.unitPriceMinor),
                tax: {
                    taxId: isShipping ? null : (l.taxId ?? null),
                    taxName: isShipping ? null : (t?.name ?? l.taxName ?? null),
                    taxRateBps: isShipping ? 0 : Number(t?.rateBps ?? l.taxRateBps ?? 0),
                    taxInclusive: isShipping
                        ? false
                        : Boolean(t?.isInclusive ?? l.taxInclusive ?? false),
                    taxExempt: isShipping ? true : Boolean(l.taxExempt ?? false),
                },
            });
            await tx
                .update(schema_1.invoiceLines)
                .set({
                lineNetMinor: calc.lineNetMinor,
                taxMinor: calc.taxMinor,
                lineTotalMinor: calc.lineTotalMinor,
                taxName: isShipping ? null : (t?.name ?? l.taxName ?? null),
                taxRateBps: isShipping ? 0 : Number(t?.rateBps ?? l.taxRateBps ?? 0),
                taxInclusive: isShipping
                    ? false
                    : Boolean(t?.isInclusive ?? l.taxInclusive ?? false),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.invoiceLines.id, l.id))
                .execute();
        }
        const fresh = await tx
            .select()
            .from(schema_1.invoiceLines)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceLines.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoiceLines.invoiceId, invoiceId)))
            .execute();
        const taxableLines = fresh.filter((l) => l.meta?.kind !== 'shipping');
        const shippingLines = fresh.filter((l) => l.meta?.kind === 'shipping');
        const taxableTotals = this.totals.calcInvoice(taxableLines.map((l) => ({
            quantity: Number(l.quantity),
            unitPriceMinor: Number(l.unitPriceMinor),
            tax: {
                taxRateBps: Number(l.taxRateBps ?? 0),
                taxInclusive: Boolean(l.taxInclusive),
                taxExempt: Boolean(l.taxExempt),
            },
        })));
        const shippingMinor = shippingLines.reduce((sum, l) => sum + Number(l.lineTotalMinor ?? 0), 0);
        const taxableBase = Math.max(taxableTotals.subtotalMinor - orderDiscountMinor, 0);
        const discountRatio = taxableTotals.subtotalMinor > 0
            ? taxableBase / taxableTotals.subtotalMinor
            : 1;
        const taxAfterDiscount = Math.round(taxableTotals.taxMinor * discountRatio);
        const subtotalMinor = taxableTotals.subtotalMinor + shippingMinor;
        const taxMinor = taxAfterDiscount;
        const totalAfterDiscount = Math.max(taxableBase + taxAfterDiscount + shippingMinor, 0);
        const paidMinor = Number(inv.paidMinor ?? 0);
        const balanceMinor = totalAfterDiscount - paidMinor;
        const [updated] = await tx
            .update(schema_1.invoices)
            .set({
            subtotalMinor,
            taxMinor,
            discountMinor: orderDiscountMinor,
            totalMinor: totalAfterDiscount,
            paidMinor,
            balanceMinor: Math.max(balanceMinor, 0),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId))
            .returning()
            .execute();
        return updated;
    }
    async issueInvoice(invoiceId, dto, companyId, userId, ctx, opts) {
        const outerTx = ctx?.tx;
        const autoSyncZoho = opts?.autoSyncZoho ?? true;
        const firstRow = (res) => res?.rows?.[0] ?? res?.[0] ?? null;
        const toDateOrNull = (v) => {
            if (v == null)
                return null;
            if (v instanceof Date)
                return v;
            const d = new Date(v);
            if (Number.isNaN(d.getTime())) {
                throw new common_1.BadRequestException(`Invalid date value: ${String(v)}`);
            }
            return d;
        };
        const addressSelectFields = {
            line1: schema_1.customerAddresses.line1,
            line2: schema_1.customerAddresses.line2,
            city: schema_1.customerAddresses.city,
            state: schema_1.customerAddresses.state,
            postalCode: schema_1.customerAddresses.postalCode,
            country: schema_1.customerAddresses.country,
            addressee: schema_1.customerAddresses.addressee,
            companyName: schema_1.customerAddresses.companyName,
            firstName: schema_1.customerAddresses.firstName,
            lastName: schema_1.customerAddresses.lastName,
        };
        const run = async (tx) => {
            const invRes = await tx.execute((0, drizzle_orm_1.sql) `
      SELECT * FROM invoices
      WHERE id = ${invoiceId} AND company_id = ${companyId}
      FOR UPDATE
    `);
            const inv = firstRow(invRes);
            if (!inv)
                throw new common_1.NotFoundException('Invoice not found');
            if (inv.status !== 'draft')
                return inv;
            const lines = await tx
                .select()
                .from(schema_1.invoiceLines)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceLines.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoiceLines.invoiceId, invoiceId)))
                .execute();
            if (!lines.length)
                throw new common_1.BadRequestException('Invoice has no lines');
            const storeId = dto.storeId ?? inv.store_id ?? null;
            const year = new Date().getUTCFullYear();
            const requestedSeriesName = (dto.seriesName ?? 'Default').trim();
            const seriesRes = await tx.execute((0, drizzle_orm_1.sql) `
      SELECT *
      FROM invoice_series
      WHERE company_id = ${companyId}
        AND (store_id IS NULL OR store_id = ${storeId})
        AND lower(trim(name)) = lower(trim(${requestedSeriesName}))
        AND (year IS NULL OR year = ${year})
      ORDER BY store_id DESC NULLS LAST
      LIMIT 1
      FOR UPDATE
    `);
            const series = firstRow(seriesRes);
            if (!series) {
                throw new common_1.BadRequestException(`Invoice series not found for company=${companyId}, store=${storeId ?? 'NULL'}, name=${requestedSeriesName}, year=${year}. Create invoice_series first.`);
            }
            const nextNumber = Number(series.next_number);
            const number = this.formatInvoiceNumber(series.prefix, nextNumber);
            await tx.execute((0, drizzle_orm_1.sql) `
      UPDATE invoice_series
      SET next_number = next_number + 1,
          updated_at = NOW()
      WHERE id = ${series.id}
    `);
            const brandingRows = await tx
                .select()
                .from(schema_1.invoiceBranding)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceBranding.companyId, companyId), storeId
                ? (0, drizzle_orm_1.sql) `(${schema_1.invoiceBranding.storeId} = ${storeId} OR ${schema_1.invoiceBranding.storeId} IS NULL)`
                : (0, drizzle_orm_1.sql) `${schema_1.invoiceBranding.storeId} IS NULL`))
                .orderBy((0, drizzle_orm_1.sql) `${schema_1.invoiceBranding.storeId} IS NULL ASC`)
                .execute();
            const branding = brandingRows[0];
            const supplierSnapshot = {
                name: branding?.supplierName ?? 'Your Company',
                address: branding?.supplierAddress ?? '',
                email: branding?.supplierEmail ?? '',
                phone: branding?.supplierPhone ?? '',
                taxId: branding?.supplierTaxId ?? '',
                bankDetails: branding?.bankDetails ?? null,
            };
            let customerSnapshot = inv.customer_snapshot ?? null;
            if (!customerSnapshot) {
                const orderId = inv.order_id ?? inv.orderId ?? null;
                let customerId = null;
                if (orderId) {
                    const orderRes = await tx.execute((0, drizzle_orm_1.sql) `SELECT customer_id FROM orders WHERE id = ${orderId} AND company_id = ${companyId} LIMIT 1`);
                    const order = firstRow(orderRes);
                    customerId = order?.customer_id ?? null;
                }
                if (customerId) {
                    const [customer] = await tx
                        .select({
                        displayName: schema_1.customers.displayName,
                        billingEmail: schema_1.customers.billingEmail,
                        phone: schema_1.customers.phone,
                        taxId: schema_1.customers.taxId,
                        companyName: schema_1.customers.companyName,
                    })
                        .from(schema_1.customers)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.id, customerId), (0, drizzle_orm_1.eq)(schema_1.customers.companyId, companyId)))
                        .limit(1)
                        .execute();
                    let [address] = await tx
                        .select(addressSelectFields)
                        .from(schema_1.customerAddresses)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, customerId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.isDefaultBilling, true)))
                        .limit(1)
                        .execute();
                    if (!address) {
                        [address] = await tx
                            .select(addressSelectFields)
                            .from(schema_1.customerAddresses)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, customerId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, companyId)))
                            .orderBy((0, drizzle_orm_1.sql) `is_default_shipping DESC, created_at ASC`)
                            .limit(1)
                            .execute();
                    }
                    if (customer) {
                        const addressName = (address?.addressee ??
                            [address?.firstName, address?.lastName]
                                .filter(Boolean)
                                .join(' ')
                                .trim()) ||
                            null;
                        customerSnapshot = {
                            name: addressName ?? customer.displayName,
                            email: customer.billingEmail ?? '',
                            phone: customer.phone ?? '',
                            taxId: customer.taxId ?? '',
                            companyName: address?.companyName ?? customer.companyName ?? '',
                            address: address
                                ? [
                                    address.line1,
                                    address.line2,
                                    address.city,
                                    address.state,
                                    address.postalCode,
                                    address.country,
                                ]
                                    .filter(Boolean)
                                    .join(', ')
                                : '',
                        };
                    }
                }
            }
            if (customerSnapshot) {
                customerSnapshot = {
                    name: customerSnapshot.name ?? 'Customer',
                    email: customerSnapshot.email ?? '',
                    phone: customerSnapshot.phone ?? '',
                    taxId: customerSnapshot.taxId ?? '',
                    companyName: customerSnapshot.companyName ?? '',
                    address: customerSnapshot.address ?? '',
                };
            }
            customerSnapshot = customerSnapshot ?? {
                name: 'Customer',
                email: '',
                phone: '',
                taxId: '',
                companyName: '',
                address: '',
            };
            const taxIds = Array.from(new Set(lines.map((l) => l.taxId).filter(Boolean)));
            const taxMap = new Map();
            if (taxIds.length) {
                const taxRows = await tx
                    .select()
                    .from(schema_1.taxes)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.taxes.id, taxIds)))
                    .execute();
                for (const t of taxRows)
                    taxMap.set(t.id, t);
            }
            for (const l of lines) {
                const isShipping = l.meta?.kind === 'shipping';
                const t = !isShipping && l.taxId ? taxMap.get(l.taxId) : null;
                const taxRateBps = isShipping
                    ? 0
                    : l.taxExempt
                        ? 0
                        : Number(t?.rateBps ?? l.taxRateBps ?? 0);
                const taxInclusive = isShipping
                    ? false
                    : Boolean(t?.isInclusive ?? l.taxInclusive ?? false);
                const taxName = isShipping ? null : (t?.name ?? l.taxName ?? null);
                const calc = this.totals.calcLine({
                    quantity: Number(l.quantity),
                    unitPriceMinor: Number(l.unitPriceMinor),
                    tax: {
                        taxId: isShipping ? null : (l.taxId ?? null),
                        taxName,
                        taxRateBps,
                        taxInclusive,
                        taxExempt: isShipping ? true : Boolean(l.taxExempt),
                    },
                });
                await tx
                    .update(schema_1.invoiceLines)
                    .set({
                    lineNetMinor: calc.lineNetMinor,
                    taxMinor: calc.taxMinor,
                    lineTotalMinor: calc.lineTotalMinor,
                    taxName,
                    taxRateBps,
                    taxInclusive,
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.invoiceLines.id, l.id))
                    .execute();
            }
            const frozenLines = await tx
                .select()
                .from(schema_1.invoiceLines)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceLines.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoiceLines.invoiceId, invoiceId)))
                .execute();
            const taxableLines = frozenLines.filter((l) => l.meta?.kind !== 'shipping');
            const shippingLines = frozenLines.filter((l) => l.meta?.kind === 'shipping');
            const taxableTotals = this.totals.calcInvoice(taxableLines.map((l) => ({
                quantity: Number(l.quantity),
                unitPriceMinor: Number(l.unitPriceMinor),
                tax: {
                    taxRateBps: Number(l.taxRateBps ?? 0),
                    taxInclusive: Boolean(l.taxInclusive),
                    taxExempt: Boolean(l.taxExempt),
                },
            })));
            const shippingMinor = shippingLines.reduce((sum, l) => sum + Number(l.lineTotalMinor ?? 0), 0);
            const orderDiscountMinor = Number(inv.discount_minor ?? inv.discountMinor ?? 0);
            const taxableBase = Math.max(taxableTotals.subtotalMinor - orderDiscountMinor, 0);
            const discountRatio = taxableTotals.subtotalMinor > 0
                ? taxableBase / taxableTotals.subtotalMinor
                : 1;
            const taxAfterDiscount = Math.round(taxableTotals.taxMinor * discountRatio);
            const subtotalMinor = taxableTotals.subtotalMinor + shippingMinor;
            const taxMinor = taxAfterDiscount;
            const totalMinor = Math.max(taxableBase + taxAfterDiscount + shippingMinor, 0);
            const issuedAt = new Date();
            const dueAt = toDateOrNull(dto.dueAt ?? inv.due_at ?? null);
            const paidMinor = Number(inv.paid_minor ?? 0);
            const balanceMinor = totalMinor - paidMinor;
            const updatedRows = await tx
                .update(schema_1.invoices)
                .set({
                status: paidMinor > 0
                    ? paidMinor >= totalMinor
                        ? 'paid'
                        : 'partially_paid'
                    : 'issued',
                seriesId: series.id,
                number,
                issuedAt,
                dueAt,
                subtotalMinor,
                taxMinor,
                discountMinor: orderDiscountMinor,
                totalMinor,
                paidMinor,
                balanceMinor: Math.max(balanceMinor, 0),
                supplierSnapshot,
                customerSnapshot,
                lockedAt: issuedAt,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId))
                .returning()
                .execute();
            const updated = updatedRows[0];
            if (userId && updated) {
                await this.auditService.logAction({
                    action: 'issue',
                    entity: 'invoice',
                    entityId: updated.id,
                    userId: userId,
                    details: 'Issued invoice',
                    changes: {
                        companyId,
                        invoiceId: updated.id,
                        number,
                        seriesId: series.id,
                        issuedAt: issuedAt.toISOString(),
                        dueAt: dueAt ? dueAt.toISOString() : null,
                        totals: { subtotalMinor, taxMinor, totalMinor },
                    },
                });
            }
            return updated;
        };
        const issued = outerTx
            ? await run(outerTx)
            : await this.db.transaction(async (tx) => run(tx));
        await this.cache.bumpCompanyVersion(companyId);
        if (!outerTx && autoSyncZoho) {
            try {
                const storeId = issued.storeId ?? issued.store_id ?? null;
                const zohoActive = storeId
                    ? await this.zohoService.isEnabled(companyId, storeId)
                    : false;
                if (zohoActive) {
                    await this.zohoInvoices.syncInvoiceToZoho(companyId, issued.id, opts?.actor, opts?.ip, {
                        customer: opts?.zohoCustomer,
                        softFailMissingCustomer: true,
                    });
                    await this.cache.bumpCompanyVersion(companyId);
                }
            }
            catch (e) {
                console.error('Error syncing issued invoice to Zoho:', e);
            }
        }
        return issued;
    }
    async getInvoiceWithLines(companyId, invoiceId) {
        const [inv] = await this.db
            .select()
            .from(schema_1.invoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId)))
            .execute();
        if (!inv)
            throw new common_1.NotFoundException('Invoice not found');
        const lines = await this.db
            .select()
            .from(schema_1.invoiceLines)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceLines.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoiceLines.invoiceId, invoiceId)))
            .execute();
        return { invoice: inv, lines };
    }
    async listInvoices(companyId, opts) {
        const limit = Math.min(Number(opts?.limit ?? 50), 200);
        const offset = Math.max(Number(opts?.offset ?? 0), 0);
        const whereClauses = [(0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId)];
        if (opts?.storeId !== undefined) {
            whereClauses.push(opts.storeId === null
                ? (0, drizzle_orm_1.isNull)(schema_1.invoices.storeId)
                : (0, drizzle_orm_1.eq)(schema_1.invoices.storeId, opts.storeId));
        }
        if (opts?.orderId)
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.invoices.orderId, opts.orderId));
        if (opts?.status)
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.invoices.status, opts.status));
        if (opts?.type)
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.invoices.type, opts.type));
        if (opts?.q && opts.q.trim()) {
            const q = `%${opts.q.trim()}%`;
            whereClauses.push((0, drizzle_orm_1.sql) `(
        ${schema_1.invoices.number} ILIKE ${q}
        OR ${schema_1.invoices.meta}->>'orderNumber' ILIKE ${q}
        OR ${schema_1.invoices.customerSnapshot}->>'name' ILIKE ${q}
      )`);
        }
        const where = (0, drizzle_orm_1.and)(...whereClauses);
        const [rows, [{ count }]] = await Promise.all([
            this.db
                .select({
                id: schema_1.invoices.id,
                type: schema_1.invoices.type,
                number: schema_1.invoices.number,
                status: schema_1.invoices.status,
                currency: schema_1.invoices.currency,
                subtotalMinor: schema_1.invoices.subtotalMinor,
                taxMinor: schema_1.invoices.taxMinor,
                totalMinor: schema_1.invoices.totalMinor,
                paidMinor: schema_1.invoices.paidMinor,
                balanceMinor: schema_1.invoices.balanceMinor,
                orderId: schema_1.invoices.orderId,
                storeId: schema_1.invoices.storeId,
                issuedAt: schema_1.invoices.issuedAt,
                dueAt: schema_1.invoices.dueAt,
                createdAt: schema_1.invoices.createdAt,
                updatedAt: schema_1.invoices.updatedAt,
                meta: schema_1.invoices.meta,
                customerSnapshot: schema_1.invoices.customerSnapshot,
            })
                .from(schema_1.invoices)
                .where(where)
                .orderBy((0, drizzle_orm_1.sql) `${schema_1.invoices.createdAt} DESC`)
                .limit(limit)
                .offset(offset)
                .execute(),
            this.db
                .select({ count: (0, drizzle_orm_1.sql) `cast(count(*) as int)` })
                .from(schema_1.invoices)
                .where(where)
                .execute(),
        ]);
        return { rows, count, limit, offset };
    }
    async updateDraftLineAndRecalculate(companyId, invoiceId, lineId, dto, audit) {
        return this.db.transaction(async (tx) => {
            const [inv] = await tx
                .select()
                .from(schema_1.invoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId)))
                .execute();
            if (!inv)
                throw new common_1.NotFoundException('Invoice not found');
            if (inv.status !== 'draft') {
                throw new common_1.BadRequestException('Only draft invoices can be edited');
            }
            const [line] = await tx
                .select()
                .from(schema_1.invoiceLines)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceLines.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoiceLines.invoiceId, invoiceId), (0, drizzle_orm_1.eq)(schema_1.invoiceLines.id, lineId)))
                .execute();
            if (!line)
                throw new common_1.NotFoundException('Invoice line not found');
            const taxIdProvided = dto.taxId !== undefined;
            const normalizedTaxId = dto.taxId === undefined || dto.taxId === null || dto.taxId === ''
                ? null
                : dto.taxId;
            if (taxIdProvided && normalizedTaxId) {
                const [t] = await tx
                    .select({ id: schema_1.taxes.id })
                    .from(schema_1.taxes)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.taxes.id, normalizedTaxId), (0, drizzle_orm_1.eq)(schema_1.taxes.isActive, true)))
                    .execute();
                if (!t)
                    throw new common_1.BadRequestException('Tax not found or inactive');
            }
            if (dto.unitPriceMinor !== undefined && dto.unitPriceMinor < 0) {
                throw new common_1.BadRequestException('unitPriceMinor cannot be negative');
            }
            if (dto.discountMinor !== undefined && dto.discountMinor < 0) {
                throw new common_1.BadRequestException('discountMinor cannot be negative');
            }
            if (dto.quantity !== undefined && dto.quantity <= 0) {
                throw new common_1.BadRequestException('quantity must be > 0');
            }
            const patch = {
                ...(dto.description !== undefined
                    ? { description: dto.description }
                    : {}),
                ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
                ...(dto.unitPriceMinor !== undefined
                    ? { unitPriceMinor: dto.unitPriceMinor }
                    : {}),
                ...(dto.discountMinor !== undefined
                    ? { discountMinor: dto.discountMinor }
                    : {}),
                ...(taxIdProvided ? { taxId: normalizedTaxId } : {}),
                ...(dto.taxExempt !== undefined ? { taxExempt: dto.taxExempt } : {}),
                ...(dto.taxExemptReason !== undefined
                    ? { taxExemptReason: dto.taxExemptReason }
                    : {}),
            };
            const touchesTax = taxIdProvided ||
                dto.taxExempt !== undefined ||
                dto.taxExemptReason !== undefined;
            if (touchesTax) {
                patch.taxName = null;
                patch.taxRateBps = 0;
                patch.taxInclusive = false;
            }
            await tx
                .update(schema_1.invoiceLines)
                .set(patch)
                .where((0, drizzle_orm_1.eq)(schema_1.invoiceLines.id, lineId))
                .execute();
            await this.recalculateDraftTotals(companyId, invoiceId, { tx });
            if (audit?.userId) {
                await this.auditService.logAction({
                    action: 'update',
                    entity: 'invoice_line',
                    entityId: lineId,
                    userId: audit.userId,
                    details: 'Updated draft invoice line and recalculated totals',
                    ipAddress: audit.ip,
                    changes: {
                        companyId,
                        invoiceId,
                        lineId,
                        patch,
                    },
                });
            }
            const [finalInv] = await tx
                .select()
                .from(schema_1.invoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId)))
                .execute();
            const finalLines = await tx
                .select()
                .from(schema_1.invoiceLines)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceLines.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoiceLines.invoiceId, invoiceId)))
                .execute();
            return { invoice: finalInv, lines: finalLines };
        });
    }
    formatInvoiceNumber(prefix, n) {
        const padded = n.toString().padStart(6, '0');
        return `${prefix}${padded}`;
    }
    async updateDraftInvoice(companyId, invoiceId, dto, audit, ctx) {
        const tx = ctx?.tx ?? this.db;
        return (tx.transaction?.(async (trx) => {
            const db = trx ?? tx;
            const [inv] = await db
                .select()
                .from(schema_1.invoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId)))
                .execute();
            if (!inv)
                throw new common_1.NotFoundException('Invoice not found');
            if (inv.status !== 'draft') {
                throw new common_1.BadRequestException('Only draft invoices can be edited');
            }
            const toDateOrNull = (v) => {
                if (v === undefined)
                    return undefined;
                if (v === null || v === '')
                    return null;
                const d = new Date(v);
                if (Number.isNaN(d.getTime())) {
                    throw new common_1.BadRequestException('Invalid date');
                }
                return d;
            };
            const patch = {
                ...(dto.storeId !== undefined ? { storeId: dto.storeId } : {}),
                ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
                ...(dto.customerSnapshot !== undefined
                    ? { customerSnapshot: dto.customerSnapshot }
                    : {}),
                ...(dto.issuedAt !== undefined
                    ? { issuedAt: toDateOrNull(dto.issuedAt) }
                    : {}),
                ...(dto.dueAt !== undefined
                    ? { dueAt: toDateOrNull(dto.dueAt) }
                    : {}),
                updatedAt: new Date(),
            };
            const [updated] = await db
                .update(schema_1.invoices)
                .set(patch)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId)))
                .returning()
                .execute();
            if (audit?.userId) {
                await this.auditService.logAction({
                    action: 'update',
                    entity: 'invoice',
                    entityId: updated.id,
                    userId: audit.userId,
                    ipAddress: audit.ip,
                    details: 'Updated draft invoice header',
                    changes: {
                        companyId,
                        invoiceId: updated.id,
                        patch: {
                            ...patch,
                            issuedAt: patch.issuedAt
                                ? patch.issuedAt.toISOString?.()
                                : patch.issuedAt,
                            dueAt: patch.dueAt ? patch.dueAt.toISOString?.() : patch.dueAt,
                        },
                    },
                });
            }
            return updated;
        }) ??
            (async () => {
                const [inv] = await tx
                    .select()
                    .from(schema_1.invoices)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId)))
                    .execute();
                if (!inv)
                    throw new common_1.NotFoundException('Invoice not found');
                if (inv.status !== 'draft') {
                    throw new common_1.BadRequestException('Only draft invoices can be edited');
                }
                const toDateOrNull = (v) => {
                    if (v === undefined)
                        return undefined;
                    if (v === null || v === '')
                        return null;
                    const d = new Date(v);
                    if (Number.isNaN(d.getTime())) {
                        throw new common_1.BadRequestException('Invalid date');
                    }
                    return d;
                };
                const patch = {
                    ...(dto.storeId !== undefined ? { storeId: dto.storeId } : {}),
                    ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
                    ...(dto.customerSnapshot !== undefined
                        ? { customerSnapshot: dto.customerSnapshot }
                        : {}),
                    ...(dto.issuedAt !== undefined
                        ? { issuedAt: toDateOrNull(dto.issuedAt) }
                        : {}),
                    ...(dto.dueAt !== undefined
                        ? { dueAt: toDateOrNull(dto.dueAt) }
                        : {}),
                    updatedAt: new Date(),
                };
                const [updated] = await tx
                    .update(schema_1.invoices)
                    .set(patch)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId)))
                    .returning()
                    .execute();
                if (audit?.userId) {
                    await this.auditService.logAction({
                        action: 'update',
                        entity: 'invoice',
                        entityId: updated.id,
                        userId: audit.userId,
                        ipAddress: audit.ip,
                        details: 'Updated draft invoice header',
                        changes: { companyId, invoiceId: updated.id, patch },
                    });
                }
                return updated;
            })());
    }
    async seedDefaultInvoiceSeriesForCompany(companyId) {
        const prefix = 'INV-';
        const name = 'Default';
        const nextNumber = 1;
        const run = async (tx) => {
            const existing = await tx
                .select({ id: schema_1.invoiceSeries.id })
                .from(schema_1.invoiceSeries)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceSeries.companyId, companyId), (0, drizzle_orm_1.isNull)(schema_1.invoiceSeries.storeId), (0, drizzle_orm_1.isNull)(schema_1.invoiceSeries.year), (0, drizzle_orm_1.sql) `lower(trim(${schema_1.invoiceSeries.name})) = 'default'`))
                .limit(1)
                .execute();
            if (existing.length) {
                return { created: false, id: existing[0].id };
            }
            const inserted = await tx
                .insert(schema_1.invoiceSeries)
                .values({
                companyId,
                storeId: null,
                year: null,
                name,
                prefix,
                nextNumber,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning({ id: schema_1.invoiceSeries.id })
                .execute();
            return { created: true, id: inserted[0].id };
        };
        const result = await this.db.transaction(run);
        await this.cache.bumpCompanyVersion(companyId);
        return result;
    }
    async syncToZoho(companyId, invoiceId, actor, ip, input, ctx) {
        const outerTx = ctx?.tx;
        const [inv] = await this.db
            .select({ id: schema_1.invoices.id, storeId: schema_1.invoices.storeId })
            .from(schema_1.invoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId)))
            .execute();
        if (!inv)
            throw new common_1.NotFoundException('Invoice not found');
        const zohoActive = inv.storeId
            ? await this.zohoService.isEnabled(companyId, inv.storeId)
            : false;
        if (!zohoActive) {
            throw new common_1.BadRequestException('Zoho integration is not active for this store');
        }
        const run = async (tx) => {
            const [locked] = await tx
                .select({ id: schema_1.invoices.id })
                .from(schema_1.invoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId)))
                .for('update')
                .execute();
            if (!locked)
                throw new common_1.NotFoundException('Invoice not found');
            return this.zohoInvoices.syncInvoiceToZohoTx(tx, companyId, invoiceId, actor, ip, input);
        };
        const result = outerTx
            ? await run(outerTx)
            : await this.db.transaction(run);
        await this.cache.bumpCompanyVersion(companyId);
        return result;
    }
    async voidAndRecreateDraft(companyId, orderId, ctx) {
        const tx = ctx?.tx ?? this.db;
        const [existingInvoice] = await tx
            .select()
            .from(schema_1.invoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.orderId, orderId)))
            .orderBy((0, drizzle_orm_1.sql) `${schema_1.invoices.createdAt} DESC`)
            .limit(1)
            .execute();
        if (!existingInvoice)
            return null;
        if (existingInvoice.status === 'draft') {
            return this.syncFromOrder(orderId, companyId, { tx });
        }
        await tx
            .update(schema_1.invoices)
            .set({
            status: 'draft',
            number: null,
            seriesId: null,
            issuedAt: null,
            lockedAt: null,
            supplierSnapshot: null,
            customerSnapshot: null,
            subtotalMinor: 0,
            taxMinor: 0,
            totalMinor: 0,
            balanceMinor: 0,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.invoices.id, existingInvoice.id))
            .execute();
        await tx
            .delete(schema_1.invoiceLines)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceLines.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoiceLines.invoiceId, existingInvoice.id)))
            .execute();
        return this.syncFromOrder(orderId, companyId, { tx });
    }
};
exports.InvoiceService = InvoiceService;
exports.InvoiceService = InvoiceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, invoice_totals_service_1.InvoiceTotalsService,
        audit_service_1.AuditService,
        cache_service_1.CacheService,
        zoho_invoices_service_1.ZohoInvoicesService,
        zoho_service_1.ZohoService])
], InvoiceService);
//# sourceMappingURL=invoice.service.js.map