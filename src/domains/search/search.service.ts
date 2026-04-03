import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import {
  invoices,
  orders,
  quoteRequests,
  customers, // add this
} from 'src/infrastructure/drizzle/schema';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from 'src/infrastructure/drizzle/types/drizzle';

@Injectable()
export class SearchService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  async globalSearch(
    companyId: string,
    q: string,
    type: 'all' | 'orders' | 'invoices' | 'quotes' | 'customers' = 'all',
  ) {
    const pattern = `%${q}%`;

    const ordersQuery = this.db
      .select({
        id: orders.id,
        number: orders.orderNumber,
        customer: sql<string>`null`.as('customer'),
        status: orders.status,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, companyId),
          ilike(orders.orderNumber, pattern),
        ),
      )
      .limit(5);

    const invoicesQuery = this.db
      .select({
        id: invoices.id,
        number: invoices.number,
        customer: sql<string>`${invoices.customerSnapshot}->>'name'`.as(
          'customer',
        ),
        status: invoices.status,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, companyId),
          or(
            ilike(invoices.number, pattern),
            sql`${invoices.customerSnapshot}->>'name' ilike ${pattern}`,
            sql`${invoices.customerSnapshot}->>'email' ilike ${pattern}`,
          ),
        ),
      )
      .limit(5);

    const quotesQuery = this.db
      .select({
        id: quoteRequests.id,
        number: quoteRequests.quoteNumber,
        customer: quoteRequests.customerName,
        status: quoteRequests.status,
      })
      .from(quoteRequests)
      .where(
        and(
          eq(quoteRequests.companyId, companyId),
          or(
            ilike(quoteRequests.quoteNumber, pattern),
            ilike(quoteRequests.customerName, pattern),
            ilike(quoteRequests.customerEmail, pattern),
          ),
        ),
      )
      .limit(5);

    const customersQuery = this.db
      .select({
        id: customers.id,
        number: sql<string>`null`.as('number'),
        customer: customers.firstName,
        status: sql<string>`null`.as('status'),
        email: customers.billingEmail,
      })
      .from(customers)
      .where(
        and(
          eq(customers.companyId, companyId),
          or(
            ilike(customers.firstName, pattern),
            ilike(customers.billingEmail, pattern),
          ),
        ),
      )
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

    const [orderRows, invoiceRows, quoteRows, customerRows] = await Promise.all(
      [ordersQuery, invoicesQuery, quotesQuery, customersQuery],
    );

    return {
      orders: orderRows,
      invoices: invoiceRows,
      quotes: quoteRows,
      customers: customerRows,
    };
  }
}
