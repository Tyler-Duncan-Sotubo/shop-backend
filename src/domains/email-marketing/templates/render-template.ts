import { EmailSenderConfig } from 'src/infrastructure/drizzle/schema/email-marketing/email-sender-config.schema';

export type TemplateType = 'new_arrival' | 'promotion' | 'newsletter';

export function renderCampaignTemplate(
  templateType: TemplateType,
  content: Record<string, any>,
  config: EmailSenderConfig,
): string {
  const body = (() => {
    switch (templateType) {
      case 'new_arrival':
        return renderNewArrival(content);
      case 'promotion':
        return renderPromotion(content);
      case 'newsletter':
        return renderNewsletter(content);
      default:
        throw new Error(`Unknown template type: ${templateType}`);
    }
  })();

  return wrapWithLayout(body, config);
}

// ── Layout wrapper (header + footer) ─────────────────────────
function wrapWithLayout(body: string, config: EmailSenderConfig): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:24px 0;">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:24px;text-align:center;background:${config.brandColor ?? '#000000'};">
              ${
                config.logoUrl
                  ? `<img src="${config.logoUrl}" alt="${config.fromName}" height="40" style="display:block;margin:0 auto;" />`
                  : `<span style="color:#ffffff;font-size:20px;font-weight:bold;">${config.fromName}</span>`
              }
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 24px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px;text-align:center;background:#f9f9f9;border-top:1px solid #eeeeee;">
              ${config.footerTagline ? `<p style="margin:0 0 8px;font-size:13px;color:#666;">${config.footerTagline}</p>` : ''}
              ${config.companyAddress ? `<p style="margin:0 0 8px;font-size:12px;color:#999;">${config.companyAddress}</p>` : ''}
              <p style="margin:0;font-size:12px;color:#999;">
                <a href="{{unsubscribe_url}}" style="color:#999;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Template bodies ───────────────────────────────────────────
function renderNewArrival(content: Record<string, any>): string {
  return `
    ${content.heroImageUrl ? `<img src="${content.heroImageUrl}" alt="${content.productName}" style="width:100%;border-radius:4px;margin-bottom:24px;" />` : ''}
    <h1 style="margin:0 0 8px;font-size:24px;color:#111;">${content.productName ?? ''}</h1>
    <p style="margin:0 0 16px;font-size:20px;font-weight:bold;color:#111;">${content.price ?? ''}</p>
    ${content.buttonUrl ? `<a href="${content.buttonUrl}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:4px;font-size:15px;">${content.buttonText ?? 'Shop Now'}</a>` : ''}
  `;
}

function renderPromotion(content: Record<string, any>): string {
  const products = Array.isArray(content.products) ? content.products : [];

  return `
    <div style="background:#111;color:#fff;text-align:center;padding:24px;border-radius:4px;margin-bottom:24px;">
      <h1 style="margin:0;font-size:32px;">${content.bannerText ?? 'Sale'}</h1>
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#444;">${content.saleDetails ?? ''}</p>
    ${
      products.length
        ? `<table width="100%" cellpadding="8" cellspacing="0">
            <tr>
              ${products
                .map(
                  (p: any) => `
                <td align="center" width="${Math.floor(100 / Math.min(products.length, 3))}%">
                  ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}" style="width:100%;border-radius:4px;" />` : ''}
                  <p style="margin:8px 0 4px;font-size:14px;font-weight:bold;">${p.name ?? ''}</p>
                  <p style="margin:0;font-size:14px;color:#666;">${p.price ?? ''}</p>
                </td>`,
                )
                .join('')}
            </tr>
          </table>`
        : ''
    }
    ${content.expiryDate ? `<p style="margin:16px 0;font-size:13px;color:#999;">Offer expires: ${content.expiryDate}</p>` : ''}
    ${content.buttonUrl ? `<a href="${content.buttonUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:4px;">Shop the sale</a>` : ''}
  `;
}

function renderNewsletter(content: Record<string, any>): string {
  return `
    <div style="font-size:15px;line-height:1.6;color:#333;">
      ${content.body ?? ''}
    </div>
    ${
      content.featuredProductName
        ? `<div style="margin-top:24px;padding:16px;border:1px solid #eee;border-radius:4px;">
            ${content.featuredProductImageUrl ? `<img src="${content.featuredProductImageUrl}" alt="${content.featuredProductName}" style="width:100%;border-radius:4px;margin-bottom:12px;" />` : ''}
            <p style="margin:0 0 8px;font-size:16px;font-weight:bold;">${content.featuredProductName}</p>
            ${content.ctaUrl ? `<a href="${content.ctaUrl}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;">${content.ctaText ?? 'Learn more'}</a>` : ''}
          </div>`
        : ''
    }
  `;
}
