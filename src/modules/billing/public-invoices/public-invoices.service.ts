import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { and, eq, desc } from 'drizzle-orm';
import { randomBytes } from 'crypto';

import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import {
  invoicePublicLinks,
  invoiceDocuments,
  invoices,
} from 'src/drizzle/schema';
import { InvoicePdfService } from '../invoice/invoice-templates/invoice-pdf.service';

@Injectable()
export class PublicInvoicesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  private newToken() {
    return randomBytes(24).toString('hex'); // 48 chars
  }

  async ensureLink(params: {
    companyId: string;
    invoiceId: string;
    createdBy: string;
    expiresAt?: Date | null;
  }) {
    const { companyId, invoiceId, createdBy, expiresAt } = params;

    // ensure invoice exists & belongs to company
    const [inv] = await this.db
      .select({ id: invoices.id })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.companyId, companyId)))
      .limit(1)
      .execute();

    if (!inv) throw new NotFoundException('Invoice not found');

    // if a link exists, return it (idempotent)
    const [existing] = await this.db
      .select()
      .from(invoicePublicLinks)
      .where(eq(invoicePublicLinks.invoiceId, invoiceId))
      .limit(1)
      .execute();

    if (existing) return existing;

    const token = this.newToken();

    const [created] = await this.db
      .insert(invoicePublicLinks)
      .values({
        companyId,
        invoiceId,
        token,
        enabled: true,
        expiresAt: expiresAt ?? null,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .returning()
      .execute();

    return created;
  }

  async revokeLink(companyId: string, invoiceId: string) {
    const [row] = await this.db
      .update(invoicePublicLinks)
      .set({ enabled: false, updatedAt: new Date() } as any)
      .where(
        and(
          eq(invoicePublicLinks.companyId, companyId),
          eq(invoicePublicLinks.invoiceId, invoiceId),
        ),
      )
      .returning()
      .execute();

    if (!row) throw new NotFoundException('Public link not found');
    return row;
  }

  async rotateLink(params: {
    companyId: string;
    invoiceId: string;
    rotatedBy: string;
  }) {
    const { companyId, invoiceId } = params;
    const token = this.newToken();

    const [row] = await this.db
      .update(invoicePublicLinks)
      .set({ token, enabled: true, updatedAt: new Date() } as any)
      .where(
        and(
          eq(invoicePublicLinks.companyId, companyId),
          eq(invoicePublicLinks.invoiceId, invoiceId),
        ),
      )
      .returning()
      .execute();

    if (!row) throw new NotFoundException('Public link not found');
    return row;
  }

  // -------- PUBLIC (no auth) --------

  private assertLinkActive(link: any) {
    if (!link?.enabled) throw new NotFoundException('Invoice link not found');
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      throw new GoneException('Invoice link expired');
    }
  }

  async getPublicInvoiceByToken(token: string) {
    const [link] = await this.db
      .select()
      .from(invoicePublicLinks)
      .where(eq(invoicePublicLinks.token, token))
      .limit(1)
      .execute();

    if (!link) throw new NotFoundException('Invoice link not found');
    this.assertLinkActive(link);

    // increment view count (best-effort)
    await this.db
      .update(invoicePublicLinks)
      .set({
        viewCount: (link.viewCount ?? 0) + 1,
        lastViewedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(invoicePublicLinks.id, link.id))
      .execute();

    // Reuse your existing view model builder
    // NOTE: buildInvoiceViewModel/getBranding are currently private in InvoicePdfService.
    // Make them public OR move into a shared "InvoiceViewModelService".
    const branding = await (this.invoicePdfService as any).getBranding(
      link.companyId,
      null,
    );

    const data = await (this.invoicePdfService as any).buildInvoiceViewModel(
      link.companyId,
      link.invoiceId,
      (this.invoicePdfService as any).normalizeBrandingForRender(branding),
    );

    return { link, data };
  }

  async getPublicPdfUrlByToken(token: string) {
    const [link] = await this.db
      .select()
      .from(invoicePublicLinks)
      .where(eq(invoicePublicLinks.token, token))
      .limit(1)
      .execute();

    if (!link) throw new NotFoundException('Invoice link not found');
    this.assertLinkActive(link);

    const rows = await this.db
      .select()
      .from(invoiceDocuments)
      .where(
        and(
          eq(invoiceDocuments.companyId, link.companyId),
          eq(invoiceDocuments.invoiceId, link.invoiceId),
          eq(invoiceDocuments.kind, 'pdf'),
          eq(invoiceDocuments.status, 'generated'),
        ),
      )
      .orderBy(desc(invoiceDocuments.createdAt))
      .limit(1)
      .execute();

    const doc = rows[0];
    if (!doc?.fileUrl) throw new NotFoundException('PDF not generated yet');

    return { pdfUrl: doc.fileUrl, fileName: doc.fileName };
  }
}
