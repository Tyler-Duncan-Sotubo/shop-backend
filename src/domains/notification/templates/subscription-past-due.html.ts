// src/domains/notification/templates/subscription-past-due.html.ts
export interface SubscriptionPastDueTemplateData {
  companyName: string;
  ownerName: string;
  planName: string;
  fixPaymentUrl: string;
  daysUntilExpiry: number;
}

export const subscriptionPastDueHtml = (
  d: SubscriptionPastDueTemplateData,
): string => `
<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Your MyCenta subscription needs attention</title>
    <style>
      html, body { margin: 0 !important; padding: 0 !important; }
      table { border-spacing: 0 !important; border-collapse: collapse !important; margin: 0 auto !important; }
      a { text-decoration: none; }
      @media screen and (max-width: 600px) {
        .container { width: 100% !important; }
        .px { padding-left: 16px !important; padding-right: 16px !important; }
        .btn { width: 100% !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="background:#f6f7f9;">
    <div style="display:none;font-size:1px;color:#f6f7f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
      Your MyCenta subscription needs attention — please update your payment details to keep access.
    </div>

    <table role="presentation" width="100%" style="background:#f6f7f9;">
      <tr>
        <td align="center" style="padding: 24px 12px;">
          <table role="presentation" width="600" class="container" style="width:600px;max-width:600px;">

            <!-- Header -->
            <tr>
              <td class="px" style="padding: 8px 24px 14px 24px;">
                <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827;">
                  <div style="font-size:12px; color:#6b7280; letter-spacing:0.02em;">MyCenta</div>
                  <div style="font-size:18px; font-weight:700; margin-top:4px;">
                    Subscription needs attention
                  </div>
                </div>
              </td>
            </tr>

            <!-- Card -->
            <tr>
              <td style="background:#ffffff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;">
                <table role="presentation" width="100%">

                  <!-- Banner -->
                  <tr>
                    <td style="background:#dc2626; padding: 20px 24px; border-radius:16px 16px 0 0;">
                      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#ffffff;">
                        <div style="font-size:22px; font-weight:800; line-height:1.2;">
                          Action required
                        </div>
                        <div style="font-size:14px; margin-top:6px; opacity:0.85;">
                          Your account will be suspended in ${d.daysUntilExpiry} day${d.daysUntilExpiry === 1 ? '' : 's'} if not resolved
                        </div>
                      </div>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td class="px" style="padding: 24px 24px 8px 24px;">
                      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827;">
                        <div style="font-size:15px; line-height:1.6;">
                          Hi ${d.ownerName},
                        </div>
                        <div style="font-size:15px; line-height:1.6; margin-top:12px;">
                          We were unable to process your subscription payment for the
                          <strong>${d.planName}</strong> plan on <strong>${d.companyName}</strong>.
                        </div>
                        <div style="font-size:15px; line-height:1.6; margin-top:12px;">
                          Please update your billing details to avoid losing access to your account.
                          You have <strong>${d.daysUntilExpiry} day${d.daysUntilExpiry === 1 ? '' : 's'}</strong> before your account is suspended.
                        </div>
                      </div>
                    </td>
                  </tr>

                  <!-- CTA -->
                  <tr>
                    <td class="px" style="padding: 20px 24px 24px 24px;">
                      <a href="${d.fixPaymentUrl}" class="btn"
                        style="display:inline-block; background:#dc2626; color:#ffffff; border-radius:12px;
                        padding:14px 24px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI,
                        Roboto, Helvetica, Arial; font-size:15px; font-weight:700;">
                        Update billing details
                      </a>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>

            <tr><td style="height: 18px;"></td></tr>

            <!-- Footer -->
            <tr>
              <td class="px" style="padding: 0 24px;">
                <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:11px; color:#9ca3af; line-height:1.5;">
                  You're receiving this because your MyCenta subscription requires attention.
                  If you've already sorted this out, please ignore this email.
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
