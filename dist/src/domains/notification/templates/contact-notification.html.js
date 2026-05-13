"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactNotificationHtml = void 0;
const contactNotificationHtml = (d) => `
<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${d.subject ?? 'New contact message'}</title>
    <style>
      html, body { margin: 0 !important; padding: 0 !important; height: 100% !important; width: 100% !important; }
      table { border-spacing: 0 !important; border-collapse: collapse !important; table-layout: fixed !important; margin: 0 auto !important; }
      img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
      a { text-decoration: none; }
      a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
      @media screen and (max-width: 600px) {
        .container { width: 100% !important; }
        .px { padding-left: 16px !important; padding-right: 16px !important; }
        .stack { display: block !important; width: 100% !important; }
        .btn { width: 100% !important; }
      }
    </style>
  </head>

  <body style="background:#f6f7f9;">
    <!-- Preheader -->
    <div style="display:none;font-size:1px;color:#f6f7f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
      ${d.customerName ?? d.customerEmail} • ${d.subject ?? 'New contact message'} • ${d.createdAt ?? '—'}
    </div>

    <table role="presentation" width="100%" style="background:#f6f7f9;">
      <tr>
        <td align="center" style="padding: 24px 12px;">
          <table role="presentation" width="600" class="container" style="width:600px;max-width:600px;">

            <!-- Top header -->
            <tr>
              <td class="px" style="padding: 8px 24px 14px 24px;">
                <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827;">
                  <div style="font-size:12px; color:#6b7280; letter-spacing:0.02em;">${d.storeName ?? 'Store'}</div>
                  <div style="font-size:18px; font-weight:700; margin-top:4px;">New contact message</div>
                  <div style="font-size:12px; color:#6b7280; margin-top:4px;">${d.createdAt ?? '—'}</div>
                </div>
              </td>
            </tr>

            <!-- Card -->
            <tr>
              <td style="background:#ffffff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;">
                <table role="presentation" width="100%">

                  <!-- Sender block -->
                  <tr>
                    <td class="px" style="padding: 20px 24px 12px 24px;">
                      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827;">
                        <div style="font-size:14px; color:#6b7280; margin-bottom:6px;">From</div>
                        <div style="font-size:16px; font-weight:700; line-height:1.3;">${d.customerName ?? '—'}</div>
                        <div style="margin-top:4px; font-size:14px; line-height:1.4;">
                          <a href="mailto:${d.customerEmail}" style="color:#2563eb; text-decoration:underline;">${d.customerEmail}</a>
                        </div>
                        ${d.company ? `<div style="margin-top:6px; font-size:12px; color:#6b7280;">${d.company}</div>` : ''}
                        ${d.phone ? `<div style="margin-top:4px; font-size:12px; color:#6b7280;"><a href="tel:${d.phone}" style="color:#6b7280; text-decoration:underline;">${d.phone}</a></div>` : ''}
                      </div>
                    </td>
                  </tr>

                  <!-- Subject -->
                  <tr>
                    <td class="px" style="padding: 0 24px 12px 24px;">
                      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827;">
                        <div style="font-size:14px; color:#6b7280; margin-bottom:6px;">Subject</div>
                        <div style="font-size:15px; font-weight:700;">${d.subject ?? '(no subject)'}</div>
                      </div>
                    </td>
                  </tr>

                  <!-- Message -->
                  <tr>
                    <td class="px" style="padding: 0 24px 20px 24px;">
                      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827;">
                        <div style="font-size:14px; color:#6b7280; margin-bottom:6px;">Message</div>
                        <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:14px; font-size:14px; line-height:1.6; white-space:pre-wrap;">${d.message}</div>
                      </div>
                    </td>
                  </tr>

                  <!-- CTA row -->
                  ${d.adminUrl
    ? `
                  <tr>
                    <td class="px" style="padding: 0 24px 20px 24px;">
                      <table role="presentation" width="100%">
                        <tr>
                          <td class="stack" style="padding-bottom: 10px;">
                            <a href="${d.adminUrl}" class="btn" style="display:inline-block; background:#111827; color:#ffffff; border-radius:12px; padding:12px 14px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:14px; font-weight:700;">
                              View in dashboard
                            </a>
                          </td>
                          <td class="stack" align="right" style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:12px; color:#6b7280;">
                            Tip: Reply to this email to respond.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  `
    : `
                  <tr>
                    <td class="px" style="padding: 0 24px 18px 24px;">
                      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:12px; color:#6b7280;">
                        Tip: Reply to this email to respond.
                      </div>
                    </td>
                  </tr>
                  `}

                </table>
              </td>
            </tr>

            <tr><td style="height: 18px;"></td></tr>

            <!-- Legal footer -->
            <tr>
              <td class="px" style="padding: 0 24px;">
                <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:11px; color:#9ca3af; line-height:1.5;">
                  You're receiving this because you're listed as a notification recipient for ${d.storeName ?? 'your store'}.
                </div>
              </td>
            </tr>

            <tr><td style="height: 24px;"></td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
exports.contactNotificationHtml = contactNotificationHtml;
//# sourceMappingURL=contact-notification.html.js.map