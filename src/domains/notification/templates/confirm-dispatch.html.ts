// confirm-dispatch.template.ts
export interface ConfirmDispatchTemplateData {
  orderNumber: string;
  orderId: string;
  customerName: string | null;
  itemCount: number;
  total: string | null;
  currency: string | null;
  confirmedBy: string | null;
  dispatchedAt: string | null;
  storeName?: string;
  shippingAddress?: {
    city?: string | null;
    state?: string | null;
    country?: string | null;
  } | null;
}

export const confirmDispatchHtml = (d: ConfirmDispatchTemplateData): string => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dispatch Confirmed</title>
  </head>

  <body style="margin: 0; padding: 0; background-color: #f5f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, Helvetica, sans-serif; color: #0f172a;">

    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
      Order ${d.orderNumber} has been dispatched and fulfilled.
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 28px 16px">
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
                <table width="100%">
                  <tr>
                    <td align="left" valign="middle" style="font-size: 15px; font-weight: 700; color: #0f172a;">
                      ${d.storeName ?? 'Store'}
                    </td>
                    <td align="right" valign="middle" style="font-size: 12px; color: #64748b">
                      Dispatch Confirmed
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Title -->
            <tr>
              <td style="padding: 6px 26px 0 26px">
                <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.2px;">Order Dispatched ✓</div>
                <div style="margin-top: 6px; font-size: 13px; color: #64748b; line-height: 1.6;">
                  The following order has been confirmed and dispatched by the warehouse.
                </div>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding: 18px 26px 0 26px">
                <div style="height: 1px; background-color: #eef2f6"></div>
              </td>
            </tr>

            <!-- Order Details -->
            <tr>
              <td style="padding: 18px 26px 0 26px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eef2f6; border-radius: 10px; overflow: hidden;">

                  <tr style="background-color: #f8fafc;">
                    <td style="padding: 10px 16px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Field</td>
                    <td style="padding: 10px 16px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Value</td>
                  </tr>

                  <tr style="border-top: 1px solid #eef2f6;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Order</td>
                    <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #0f172a;">${d.orderNumber}</td>
                  </tr>

                  <tr style="border-top: 1px solid #eef2f6; background-color: #f8fafc;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Customer</td>
                    <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #0f172a;">${d.customerName ?? '—'}</td>
                  </tr>

                  <tr style="border-top: 1px solid #eef2f6;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Items</td>
                    <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #0f172a;">${d.itemCount}</td>
                  </tr>

                  <tr style="border-top: 1px solid #eef2f6; background-color: #f8fafc;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Order Total</td>
                    <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #00626F;">${d.currency ?? ''} ${d.total ? Number(d.total).toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '—'}</td>
                  </tr>

                  ${
                    d.shippingAddress?.city
                      ? `
                  <tr style="border-top: 1px solid #eef2f6;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Ship To</td>
                    <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #0f172a;">
                      ${[d.shippingAddress.city, d.shippingAddress.state, d.shippingAddress.country].filter(Boolean).join(', ')}
                    </td>
                  </tr>
                  `
                      : ''
                  }

                  <tr style="border-top: 1px solid #eef2f6; background-color: #f8fafc;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Confirmed By</td>
                    <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #0f172a;">${d.confirmedBy ?? '—'}</td>
                  </tr>

                  <tr style="border-top: 1px solid #eef2f6;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Dispatched At</td>
                    <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #0f172a;">
                      ${d.dispatchedAt ? new Date(d.dispatchedAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </td>
                  </tr>

                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 22px 26px 26px 26px; font-size: 13px; line-height: 1.7; color: #334155;">
                <div style="height: 1px; background-color: #eef2f6; margin-bottom: 18px;"></div>
                <p style="margin: 0; font-size: 12px; color: #64748b;">
                  This is an automated notification. Please do not reply.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
