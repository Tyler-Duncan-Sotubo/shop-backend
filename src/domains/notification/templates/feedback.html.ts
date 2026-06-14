export interface FeedbackTemplateData {
  category: string;
  message: string;
  platform: string;
  companyId: string;
  submittedAt: string;
  companyName: string;
}

export const feedbackHtml = (d: FeedbackTemplateData): string => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>New Feedback</title>
  </head>

  <body style="margin: 0; padding: 0; background-color: #f5f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, Helvetica, sans-serif; color: #0f172a;">

    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
      New ${d.category} feedback received from ${d.platform}.
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
                      MyCenta
                    </td>
                    <td align="right" valign="middle" style="font-size: 12px; color: #64748b">
                      User Feedback
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Title -->
            <tr>
              <td style="padding: 6px 26px 0 26px">
                <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.2px;">New Feedback Received 💬</div>
                <div style="margin-top: 6px; font-size: 13px; color: #64748b; line-height: 1.6;">
                  A user from ${d.companyName} has submitted feedback via the ${d.platform} app.
                </div>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding: 18px 26px 0 26px">
                <div style="height: 1px; background-color: #eef2f6"></div>
              </td>
            </tr>

            <!-- Meta -->
            <tr>
              <td style="padding: 18px 26px 0 26px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eef2f6; border-radius: 10px; overflow: hidden;">

                  <tr style="background-color: #f8fafc;">
                    <td style="padding: 10px 16px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Field</td>
                    <td style="padding: 10px 16px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Value</td>
                  </tr>

                  <tr style="border-top: 1px solid #eef2f6;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Category</td>
                    <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #0f172a; text-transform: capitalize;">${d.category}</td>
                  </tr>

                  <tr style="border-top: 1px solid #eef2f6; background-color: #f8fafc;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Platform</td>
                    <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #0f172a; text-transform: capitalize;">${d.platform}</td>
                  </tr>

                  <tr style="border-top: 1px solid #eef2f6;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Company ID</td>
                    <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #0f172a;">${d.companyName}</td>
                  </tr>

                  <tr style="border-top: 1px solid #eef2f6; background-color: #f8fafc;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Submitted At</td>
                    <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #0f172a;">
                      ${new Date(d.submittedAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                  </tr>

                </table>
              </td>
            </tr>

            <!-- Message -->
            <tr>
              <td style="padding: 18px 26px 0 26px;">
                <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">Message</div>
                <div style="background-color: #f8fafc; border: 1px solid #eef2f6; border-radius: 10px; padding: 16px; font-size: 14px; line-height: 1.7; color: #0f172a; white-space: pre-wrap;">
                  ${d.message}
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 22px 26px 26px 26px;">
                <div style="height: 1px; background-color: #eef2f6; margin-bottom: 18px;"></div>
                <p style="margin: 0; font-size: 12px; color: #64748b;">
                  This is an automated notification. Do not reply to this email.
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
