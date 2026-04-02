import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import {
  invoices,
  orders,
  quoteRequests,
} from 'src/infrastructure/drizzle/schema';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from 'src/infrastructure/drizzle/types/drizzle';

@Injectable()
export class SearchService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  async globalSearch(companyId: string, q: string) {
    const pattern = `%${q}%`;

    const [orderRows, invoiceRows, quoteRows] = await Promise.all([
      // Orders — only orderNumber is searchable directly on the table
      this.db
        .select({
          id: orders.id,
          number: orders.orderNumber,
          customer: sql<string>`null`.as('customer'), // no name col on orders
          status: orders.status,
        })
        .from(orders)
        .where(
          and(
            eq(orders.companyId, companyId),
            ilike(orders.orderNumber, pattern),
          ),
        )
        .limit(5),

      // Invoices — number is only set after issuance; search on number + customerSnapshot jsonb
      this.db
        .select({
          id: invoices.id,
          number: invoices.number,
          // pull name out of the jsonb snapshot
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
              // search inside the jsonb snapshot for name/email
              sql`${invoices.customerSnapshot}->>'name' ilike ${pattern}`,
              sql`${invoices.customerSnapshot}->>'email' ilike ${pattern}`,
            ),
          ),
        )
        .limit(5),

      // Quotes (quoteRequests) — has customerName + customerEmail directly
      this.db
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
        .limit(5),
    ]);

    return {
      orders: orderRows,
      invoices: invoiceRows,
      quotes: quoteRows,
    };
  }
}
