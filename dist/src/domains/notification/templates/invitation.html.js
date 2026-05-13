"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invitationHtml = void 0;
const invitationHtml = (d) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>You're Invited to Access ${d.companyName}</title>
  </head>

  <body style="margin: 0; padding: 0; background-color: #f5f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, Helvetica, sans-serif; color: #0f172a;">

    <!-- Preheader -->
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
      You've been invited to access ${d.companyName}. Activate your account to get started.
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
                    <td align="left" valign="middle" style="font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.2px;">
                      ${d.companyName}
                    </td>
                    <td align="right" valign="middle" style="font-size: 12px; color: #64748b">
                      Commerce Dashboard Access
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Title -->
            <tr>
              <td style="padding: 6px 26px 0 26px">
                <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.2px;">
                  You've been invited to join ${d.companyName}
                </div>
                <div style="margin-top: 6px; font-size: 13px; color: #64748b; line-height: 1.6;">
                  Hi <strong style="color: #0f172a">${d.name}</strong>,
                </div>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding: 18px 26px 0 26px">
                <div style="height: 1px; background-color: #eef2f6"></div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 18px 26px 0 26px; font-size: 13px; color: #334155; line-height: 1.7;">
                <p style="margin: 0 0 14px 0">
                  You've been invited to access <strong>${d.companyName}</strong> and use the commerce dashboard.
                </p>
                <p style="margin: 0 0 14px 0">
                  After activating your account, you'll be able to sign in and access the tools and information available to you based on your role and permissions.
                </p>
                <ul style="margin: 0 0 14px 18px; padding: 0; color: #334155">
                  <li style="margin: 6px 0">Access your workspace securely</li>
                  <li style="margin: 6px 0">View the features available to your account</li>
                  <li style="margin: 6px 0">Collaborate with your team where applicable</li>
                  <li style="margin: 6px 0">Get started with the platform quickly</li>
                </ul>
                <p style="margin: 0">To get started, please activate your account by clicking the button below:</p>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding: 18px 26px 0 26px" align="center">
                <a href="${d.verifyLink}" style="background-color: #00626F; color: #ffffff; padding: 12px 22px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">
                  Activate Account
                </a>
                <div style="margin-top: 10px; font-size: 12px; color: #64748b; line-height: 1.6;">
                  If the button doesn't work, copy and paste this link into your browser:<br />
                  <span style="word-break: break-all; color: #00626F">${d.verifyLink}</span>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 22px 26px 26px 26px; font-size: 13px; line-height: 1.7; color: #334155;">
                <div style="height: 1px; background-color: #eef2f6; margin-bottom: 18px;"></div>
                <p style="margin: 0 0 16px 0">
                  If you have any questions, please contact your administrator for help getting started.
                </p>
                <p style="margin: 0">
                  Best regards,<br />
                  <strong>${d.companyName}</strong>
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
exports.invitationHtml = invitationHtml;
//# sourceMappingURL=invitation.html.js.map