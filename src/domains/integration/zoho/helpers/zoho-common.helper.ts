import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { getZohoApiBase } from '../zoho.oauth';
import { taxes } from 'src/infrastructure/drizzle/schema';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import type { db } from 'src/infrastructure/drizzle/types/drizzle';

type ZohoContactSearch = {
  contacts?: Array<{
    contact_id: string;
    email?: string;
    contact_name?: string;
    company_name?: string;
  }>;
};

type ZohoCreateContactResponse = {
  contact?: { contact_id: string };
};

type ZohoTaxListResponse = {
  taxes?: Array<{
    tax_id: string;
    tax_name: string;
    tax_percentage: number;
    tax_type?: string;
  }>;
};

function toCompanyNameFromEmail(email: string) {
  const local = email.split('@')[0] ?? email;
  const cleaned = local.replace(/[._-]+/g, ' ').trim();
  return cleaned.length ? cleaned[0].toUpperCase() + cleaned.slice(1) : email;
}

@Injectable()
export class ZohoCommonHelper {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}
  /**
   * Simple memory cache:
   * key = orgId|rate
   */
  private taxCache = new Map<string, string>();

  /* ------------------------------------------------------------------ */
  /* CONTACT RESOLUTION                                                  */
  /* ------------------------------------------------------------------ */

  async ensureZohoContactIdByEmail(params: {
    region: string;
    organizationId: string;
    accessToken: string;
    email: string;
    contactNameHint?: string | null;
    companyNameHint?: string | null;
  }) {
    const { region, organizationId, accessToken } = params;
    const email = params.email.trim();
    if (!email) throw new BadRequestException('customerEmail is missing');

    const base = getZohoApiBase(region);

    const companyName =
      params.companyNameHint?.trim() ||
      params.contactNameHint?.trim() ||
      toCompanyNameFromEmail(email);

    const contactName = params.contactNameHint?.trim() || companyName;

    // Search
    const searchRes = await axios.get<ZohoContactSearch>(
      `${base}/books/v3/contacts`,
      {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
        params: { organization_id: organizationId, contact_name: contactName },
      },
    );

    const contacts = searchRes.data?.contacts ?? [];
    const normalizedEmail = email.toLowerCase();
    const normalizedName = contactName.toLowerCase();

    const existing =
      contacts.find((c) => {
        const cEmail = (c.email ?? '').trim().toLowerCase();
        const cName = (c.contact_name ?? '').trim().toLowerCase();
        return (
          (cEmail && cEmail === normalizedEmail) ||
          (cName && cName === normalizedName)
        );
      }) ?? null;

    if (existing?.contact_id) return existing.contact_id;

    // Create
    const createRes = await axios.post<ZohoCreateContactResponse>(
      `${base}/books/v3/contacts`,
      {
        contact_name: contactName,
        company_name: companyName,
        contact_type: 'customer',
        customer_sub_type: 'business',
        contact_persons: [{ email, is_primary_contact: true }],
      },
      {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
        params: { organization_id: organizationId },
      },
    );

    const createdId = createRes.data?.contact?.contact_id;
    if (!createdId)
      throw new BadRequestException('Zoho did not return contact_id');

    return createdId;
  }

  /* ------------------------------------------------------------------ */
  /* TAX RESOLUTION                                                      */
  /* ------------------------------------------------------------------ */

  async resolveZohoTaxIdForInternalTaxId(params: {
    region: string;
    organizationId: string;
    accessToken: string;
    internalTaxId: string;
    tx: db;
  }): Promise<string | null> {
    const { region, organizationId, accessToken, internalTaxId, tx } = params;

    if (!internalTaxId) return null;

    // 1️⃣ Load your VAT from DB
    const [vat] = await tx
      .select()
      .from(taxes) // <-- your VAT table
      .where(eq(taxes.id, internalTaxId))
      .limit(1)
      .execute();

    if (!vat) {
      throw new BadRequestException(`Internal VAT ${internalTaxId} not found`);
    }

    // rate_bps = 750  →  7.5%
    const ratePercent = Number(vat.rateBps) / 100;

    const cacheKey = `${organizationId}|${ratePercent}`;
    if (this.taxCache.has(cacheKey)) {
      return this.taxCache.get(cacheKey)!;
    }

    // 2️⃣ Fetch Zoho taxes
    const base = getZohoApiBase(region);

    const res = await axios.get<ZohoTaxListResponse>(
      `${base}/books/v3/settings/taxes`,
      {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
        params: { organization_id: organizationId },
      },
    );

    const zohoTaxes = res.data?.taxes ?? [];

    const tolerance = 0.0001;

    const matches = zohoTaxes.filter(
      (t) =>
        t.tax_percentage != null &&
        Math.abs(Number(t.tax_percentage) - ratePercent) < tolerance,
    );

    if (!matches.length) {
      return null; // allow fallback to tax_percentage if desired
    }

    if (matches.length > 1) {
      throw new BadRequestException(
        `Multiple Zoho taxes found for ${ratePercent}%. Clean up Zoho taxes.`,
      );
    }

    const taxId = matches[0].tax_id;

    this.taxCache.set(cacheKey, taxId);

    return taxId;
  }

  /* ------------------------------------------------------------------ */
  /* ERROR FORMATTER                                                     */
  /* ------------------------------------------------------------------ */

  formatZohoError(err: unknown) {
    const e = err as AxiosError<any>;
    const status = e.response?.status;
    const zohoMsg =
      e.response?.data?.message ||
      e.response?.data?.error ||
      e.response?.data?.code;

    return `Zoho request failed${status ? ` (${status})` : ''}: ${
      zohoMsg ?? e.message
    }`;
  }
}
