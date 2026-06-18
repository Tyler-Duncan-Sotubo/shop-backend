"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionTrialEndingHtml = void 0;
const subscriptionTrialEndingHtml = (d) => `
<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Your MyCenta trial ends in ${d.daysLeft} day${d.daysLeft === 1 ? '' : 's'}</title>
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
      Your MyCenta trial ends in ${d.daysLeft} day${d.daysLeft === 1 ? '' : 's'} — upgrade to keep access.
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
                    ${d.daysLeft <= 1 ? '⚠️ Last day of your trial' : `⏳ Your trial ends in ${d.daysLeft} days`}
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
                    <td style="background:${d.daysLeft <= 3 ? '#f59e0b' : '#111827'}; padding: 20px 24px; border-radius:16px 16px 0 0;">
                      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#ffffff;">
                        <div style="font-size:28px; font-weight:800; line-height:1.2;">
                          ${d.daysLeft} day${d.daysLeft === 1 ? '' : 's'} left
                        </div>
                        <div style="font-size:14px; margin-top:6px; opacity:0.85;">
                          Trial ends ${d.trialEndsAt}
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
                          Your free trial for <strong>${d.companyName}</strong> on MyCenta ends in
                          <strong>${d.daysLeft} day${d.daysLeft === 1 ? '' : 's'}</strong>.
                          After that, your account will be locked and you won't be able to process
                          orders, send campaigns, or access your data.
                        </div>
                        <div style="font-size:15px; line-height:1.6; margin-top:12px;">
                          Upgrade now to keep everything running smoothly.
                        </div>
                      </div>
                    </td>
                  </tr>

                  <!-- CTA -->
                  <tr>
                    <td class="px" style="padding: 20px 24px 24px 24px;">
                      <a href="${d.upgradePlanUrl}" class="btn"
                        style="display:inline-block; background:#111827; color:#ffffff; border-radius:12px;
                        padding:14px 24px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI,
                        Roboto, Helvetica, Arial; font-size:15px; font-weight:700;">
                        Choose a plan →
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
                  You're receiving this because you have an active trial on MyCenta.
                  If you've already upgraded, please ignore this email.
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
exports.subscriptionTrialEndingHtml = subscriptionTrialEndingHtml;
//# sourceMappingURL=subscription-trial-ending.html.js.map