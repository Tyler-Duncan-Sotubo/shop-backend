export interface SubscriptionInvoiceTemplateData {
  companyName: string;
  ownerName: string;
  planName: string;
  amountNGN: number;
  period: string; // e.g. "July 2026"
  daysUntilExpiry: number;
}

function formatNGN(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

const BANK = {
  name: 'Guaranty Trust Bank',
  branch: 'Allen Avenue Ikeja',
  accountName: 'TOOXCLUSIVE NIGERIA LIMITED',
  accountNumber: '0156675553',
  tin: '17811613-0',
};

export const subscriptionInvoiceHtml = (
  d: SubscriptionInvoiceTemplateData,
): string => `
<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Subscription Invoice — MyCenta</title>
    <style>
      html, body { margin: 0 !important; padding: 0 !important; }
      table { border-spacing: 0 !important; border-collapse: collapse !important; margin: 0 auto !important; }
      a { text-decoration: none; }
      @media screen and (max-width: 600px) {
        .container { width: 100% !important; }
        .px { padding-left: 16px !important; padding-right: 16px !important; }
      }
    </style>
  </head>
  <body style="background:#f6f7f9;">
    <div style="display:none;font-size:1px;color:#f6f7f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
      Invoice for your MyCenta ${d.planName} subscription — ${formatNGN(d.amountNGN)} due for ${d.period}.
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
                  <div style="font-size:18px; font-weight:700; margin-top:4px;">Subscription Invoice</div>
                </div>
              </td>
            </tr>

            <!-- Card -->
            <tr>
              <td style="background:#ffffff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;">
                <table role="presentation" width="100%">

                  <!-- Banner -->
                  <tr>
                    <td style="background:#111827; padding: 20px 24px; border-radius:16px 16px 0 0;">
                      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#ffffff;">
                        <div style="font-size:13px; opacity:0.6; text-transform:uppercase; letter-spacing:0.05em;">${d.planName} Plan — ${d.period}</div>
                        <div style="font-size:32px; font-weight:800; margin-top:6px;">${formatNGN(d.amountNGN)}</div>
                        <div style="font-size:13px; margin-top:4px; opacity:0.6;">Due within ${d.daysUntilExpiry} day${d.daysUntilExpiry === 1 ? '' : 's'}</div>
                      </div>
                    </td>
                  </tr>

                  <!-- Greeting -->
                  <tr>
                    <td class="px" style="padding: 24px 24px 8px 24px;">
                      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827; font-size:15px; line-height:1.6;">
                        Hi ${d.ownerName},
                      </div>
                      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#374151; font-size:15px; line-height:1.6; margin-top:12px;">
                        Your <strong>${d.planName}</strong> subscription for <strong>${d.companyName}</strong>
                        is due for renewal. Please make a bank transfer using the details below and reply to this email
                        with your payment receipt to confirm your account.
                      </div>
                    </td>
                  </tr>

                  <!-- Invoice line items -->
                  <tr>
                    <td class="px" style="padding: 20px 24px 16px 24px;">
                      <table role="presentation" width="100%" style="border:1px solid #e5e7eb; border-radius:10px; overflow:hidden;">
                        <tr style="background:#f9fafb;">
                          <td style="padding:10px 16px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em;">Description</td>
                          <td style="padding:10px 16px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; text-align:right;">Amount</td>
                        </tr>
                        <tr style="border-top:1px solid #e5e7eb;">
                          <td style="padding:14px 16px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:14px; color:#111827;">
                            ${d.planName} Plan — ${d.period}
                          </td>
                          <td style="padding:14px 16px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:14px; color:#111827; text-align:right; font-weight:600;">
                            ${formatNGN(d.amountNGN)}
                          </td>
                        </tr>
                        <tr style="border-top:1px solid #e5e7eb; background:#f9fafb;">
                          <td style="padding:12px 16px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:14px; font-weight:700; color:#111827;">Total due</td>
                          <td style="padding:12px 16px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:14px; font-weight:700; color:#111827; text-align:right;">${formatNGN(d.amountNGN)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Payment details -->
                  <tr>
                    <td class="px" style="padding: 0 24px 24px 24px;">
                      <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:18px 20px;">
                        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:12px; font-weight:700; color:#15803d; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:12px;">
                          Payment Details
                        </div>
                        <table role="presentation" width="100%">
                          <tr>
                            <td style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#6b7280; padding-bottom:6px; width:40%;">Bank</td>
                            <td style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#111827; font-weight:600; padding-bottom:6px;">${BANK.name}</td>
                          </tr>
                          <tr>
                            <td style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#6b7280; padding-bottom:6px;">Branch</td>
                            <td style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#111827; font-weight:600; padding-bottom:6px;">${BANK.branch}</td>
                          </tr>
                          <tr>
                            <td style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#6b7280; padding-bottom:6px;">Account Name</td>
                            <td style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#111827; font-weight:600; padding-bottom:6px;">${BANK.accountName}</td>
                          </tr>
                          <tr>
                            <td style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#6b7280; padding-bottom:6px;">Account No</td>
                            <td style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:20px; color:#111827; font-weight:800; letter-spacing:0.04em; padding-bottom:6px;">${BANK.accountNumber}</td>
                          </tr>
                          <tr>
                            <td style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#6b7280;">TIN</td>
                            <td style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:13px; color:#111827; font-weight:600;">${BANK.tin}</td>
                          </tr>
                        </table>
                      </div>
                    </td>
                  </tr>

                  <!-- Terms -->
                  <tr>
                    <td class="px" style="padding: 0 24px 28px 24px;">
                      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:12px; color:#6b7280; line-height:1.6; border-top:1px solid #f3f4f6; padding-top:16px;">
                        <strong style="color:#374151;">Terms &amp; Conditions</strong><br/>
                        Payment must be received within ${d.daysUntilExpiry} days to avoid suspension of your account.
                        Use your company name as the payment narration. After payment, reply to this email with your
                        transaction receipt or reference number for confirmation. Payments are non-refundable once the
                        billing period has commenced. MyCenta reserves the right to suspend access for non-payment.
                      </div>
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
                  You're receiving this because your MyCenta subscription requires renewal.
                  If you've already paid, please ignore this email and send your receipt to billing@mycenta.com.
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
