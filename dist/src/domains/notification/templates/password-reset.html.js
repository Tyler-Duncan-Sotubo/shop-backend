"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetHtml = void 0;
const passwordResetHtml = (d) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reset Your Password</title>
  </head>

  <body style="margin: 0; padding: 0; background-color: #f5f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, Helvetica, sans-serif; color: #0f172a;">

    <!-- Preheader -->
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
      Reset your password. This link will expire in 1 hour.
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
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left" valign="middle" style="font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.2px;">
                      Account Security
                    </td>
                    <td align="right" valign="middle" style="font-size: 12px; color: #64748b">
                      Password Reset
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Title -->
            <tr>
              <td style="padding: 6px 26px 0 26px">
                <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.2px;">Reset your password</div>
                <div style="margin-top: 6px; font-size: 13px; color: #64748b; line-height: 1.6;">
                  Hello <strong style="color: #0f172a">${d.name}</strong>,
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
                  We received a request to reset the password for your account associated with this email address.
                </p>
                <p style="margin: 0">To continue, click the button below:</p>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding: 18px 26px 0 26px" align="center">
                <a href="${d.verifyLink}" style="background-color: #00626F; color: #ffffff; padding: 12px 22px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">
                  Reset Password
                </a>
                <div style="margin-top: 10px; font-size: 12px; color: #64748b; line-height: 1.6;">
                  This link will expire in <strong>1 hour</strong>.<br />
                  If the button doesn't work, copy and paste this link into your browser:<br />
                  <span style="word-break: break-all; color: #00626F">${d.verifyLink}</span>
                </div>
              </td>
            </tr>

            <!-- Security note -->
            <tr>
              <td style="padding: 18px 26px 0 26px; font-size: 13px; color: #334155; line-height: 1.7;">
                <p style="margin: 0">If you did not request a password reset, you can safely ignore this email.</p>
                <p style="margin: 14px 0 0 0">For security purposes, never share your password or reset link with anyone.</p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 22px 26px 26px 26px; font-size: 13px; line-height: 1.7; color: #334155;">
                <div style="height: 1px; background-color: #eef2f6; margin-bottom: 18px;"></div>
                <p style="margin: 0">
                  Best regards,<br />
                  <strong>Support Team</strong>
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
exports.passwordResetHtml = passwordResetHtml;
//# sourceMappingURL=password-reset.html.js.map