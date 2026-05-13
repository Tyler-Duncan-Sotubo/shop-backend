"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteNotificationHtml = void 0;
const quoteNotificationHtml = (d) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>New quote request</title>
  </head>

  <body style="margin: 0; padding: 0; background-color: #f5f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, Helvetica, sans-serif; color: #0f172a;">

    <!-- Preheader -->
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
      New quote request • ${d.customerName ?? d.customerEmail} • ${d.items.length} item(s) • ${d.createdAt ?? '—'}
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 28px 16px; background-color: #f5f7f9">
      <tr>
        <td align="center">
          <table width="640" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 640px; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #eef2f6; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">

            <!-- Brand bar -->
            <tr>
              <td style="height: 6px; background-color: #00626F"></td>
            </tr>

            <!-- Header -->
            <tr>
              <td style="padding: 22px 26px 10px 26px">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left" valign="middle" style="font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.2px;">
                      ${d.storeName ?? 'Store'}
                    </td>
                    <td align="right" valign="middle" style="font-size: 12px; color: #64748b">
                      Quote Request
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Title -->
            <tr>
              <td style="padding: 6px 26px 0 26px">
                <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.2px; color: #0f172a;">New quote request received</div>
                <div style="margin-top: 6px; font-size: 13px; color: #64748b; line-height: 1.6;">${d.createdAt ?? '—'}</div>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding: 18px 26px 0 26px">
                <div style="height: 1px; background-color: #eef2f6"></div>
              </td>
            </tr>

            <!-- Intro -->
            <tr>
              <td style="padding: 18px 26px 0 26px; font-size: 13px; color: #334155; line-height: 1.7;">
                <p style="margin: 0 0 14px 0">A new quote request has been submitted for <strong>${d.storeName ?? 'your store'}</strong>.</p>
                <p style="margin: 0">Below are the request details.</p>
              </td>
            </tr>

            <!-- Customer -->
            <tr>
              <td style="padding: 18px 26px 0 26px">
                <div style="font-size: 14px; color: #64748b; margin-bottom: 10px;">Customer</div>
                <div style="border: 1px solid #e5e7eb; background-color: #f8fafc; border-radius: 12px; padding: 14px 16px; font-size: 13px; color: #334155; line-height: 1.7;">
                  <div style="font-size: 15px; font-weight: 700; color: #0f172a">${d.customerName ?? '—'}</div>
                  <div style="margin-top: 4px">
                    <a href="mailto:${d.customerEmail}" style="color: #00626F; text-decoration: underline">${d.customerEmail}</a>
                  </div>
                  ${d.company ? `<div style="margin-top: 4px; color: #64748b">${d.company}</div>` : ''}
                  ${d.phone ? `<div style="margin-top: 4px"><a href="tel:${d.phone}" style="color: #64748b; text-decoration: underline">${d.phone}</a></div>` : ''}
                </div>
              </td>
            </tr>

            <!-- Quote meta -->
            <tr>
              <td style="padding: 18px 26px 0 26px">
                <div style="font-size: 14px; color: #64748b; margin-bottom: 10px;">Quote details</div>
                <div style="border: 1px solid #e5e7eb; background-color: #ffffff; border-radius: 12px; padding: 14px 16px; font-size: 13px; color: #334155; line-height: 1.7;">
                  <div><strong style="color: #0f172a">Quote ID:</strong> ${d.quoteId}</div>
                  ${d.items.length ? `<div style="margin-top: 4px"><strong style="color: #0f172a">Items:</strong> ${d.items.length}</div>` : ''}
                </div>
              </td>
            </tr>

            <!-- Items -->
            <tr>
              <td style="padding: 18px 26px 0 26px">
                <div style="font-size: 14px; color: #64748b; margin-bottom: 10px;">Items requested</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${d.items
    .map((item) => `
                  <tr>
                    <td style="border: 1px solid #e5e7eb; background-color: #f8fafc; border-radius: 12px; padding: 14px 16px;">
                      <div style="font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.5;">${item.name}</div>
                      ${item.variantLabel ? `<div style="margin-top: 4px; font-size: 12px; color: #64748b; line-height: 1.6;">${item.variantLabel}</div>` : ''}
                      <div style="margin-top: 6px; font-size: 12px; color: #334155;">Qty: <strong>${item.quantity}</strong></div>
                    </td>
                  </tr>
                  <tr><td style="height: 10px"></td></tr>
                  `)
    .join('')}
                </table>
              </td>
            </tr>

            <!-- Customer note -->
            ${d.customerNote
    ? `
            <tr>
              <td style="padding: 8px 26px 0 26px">
                <div style="font-size: 14px; color: #64748b; margin-bottom: 10px;">Customer note</div>
                <div style="border: 1px solid #e5e7eb; background-color: #ffffff; border-radius: 12px; padding: 14px 16px; font-size: 13px; color: #334155; line-height: 1.7; white-space: pre-wrap;">${d.customerNote}</div>
              </td>
            </tr>
            `
    : ''}

            <!-- CTA -->
            ${d.adminUrl
    ? `
            <tr>
              <td style="padding: 22px 26px 0 26px" align="center">
                <a href="${d.adminUrl}" style="background-color: #00626F; color: #ffffff; padding: 12px 22px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">
                  View in dashboard
                </a>
                <div style="margin-top: 10px; font-size: 12px; color: #64748b; line-height: 1.6;">Tip: Reply to this email to contact the customer.</div>
              </td>
            </tr>
            `
    : `
            <tr>
              <td style="padding: 22px 26px 0 26px; font-size: 12px; color: #64748b; line-height: 1.6;" align="center">
                Tip: Reply to this email to contact the customer.
              </td>
            </tr>
            `}

            <!-- Footer -->
            <tr>
              <td style="padding: 22px 26px 26px 26px; font-size: 13px; line-height: 1.7; color: #334155;">
                <div style="height: 1px; background-color: #eef2f6; margin-bottom: 18px;"></div>
                <p style="margin: 0; font-size: 12px; color: #64748b">
                  You're receiving this because you're listed as a notification recipient for ${d.storeName ?? 'your store'}.
                </p>
              </td>
            </tr>

          </table>

          <!-- Footer note -->
          <table width="640" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 640px">
            <tr>
              <td style="padding: 14px 6px 0 6px; text-align: center; font-size: 12px; color: #94a3b8;">
                This email was sent automatically. Please do not reply.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
exports.quoteNotificationHtml = quoteNotificationHtml;
//# sourceMappingURL=quote-notification.html.js.map