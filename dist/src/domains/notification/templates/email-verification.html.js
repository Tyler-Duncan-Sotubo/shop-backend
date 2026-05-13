"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailVerificationHtml = void 0;
const emailVerificationHtml = (d) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Verify Your Email – My Centa</title>
  </head>

  <body style="margin: 0; padding: 0; background-color: #f5f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, Helvetica, sans-serif; color: #0f172a;">

    <!-- Preheader -->
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
      Verify your email to get started with My Centa.
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
                    <td align="left" valign="middle">
                      <img
                        src="https://centa-hr.s3.eu-west-3.amazonaws.com/company-files/7beedcd5-66c3-4351-8955-ddcab3528652/5cf61059-52be-4c46-9d4e-9817f2b9257b/1769600186954-1768990436384-logo-CqG_6WrI.png"
                        alt="My Centa"
                        height="34"
                        style="display: block; height: 34px; width: auto"
                      />
                    </td>
                    <td align="right" valign="middle" style="font-size: 12px; color: #64748b">
                      Email Verification
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Title -->
            <tr>
              <td style="padding: 6px 26px 0 26px">
                <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.2px;">Verify your email address</div>
                <div style="margin-top: 6px; font-size: 13px; color: #64748b; line-height: 1.6;">
                  Hello <strong style="color: #0f172a">${d.companyName}</strong>,
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
                  Thank you for choosing <strong>My Centa</strong> — your all-in-one, AI-powered HR platform for smarter hiring, onboarding, and team management.
                </p>
                <p style="margin: 0 0 14px 0">
                  We've opened the verification page in your browser to help you get started right away. If it didn't open automatically or you've closed the tab, you can continue using the details below.
                </p>

                <!-- Verification Code -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e8eef4; border-radius: 12px; margin: 0 0 16px 0;">
                  <tr>
                    <td style="padding: 16px; text-align: center">
                      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">Verification Code</div>
                      <div style="font-size: 22px; font-weight: 700; letter-spacing: 2px; color: #0f172a;">${d.verificationCode}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding: 0 26px 0 26px" align="center">
                <a href="https://app.mycenta.com/verify-email" style="background-color: #00626F; color: #ffffff; padding: 12px 22px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">
                  Click to Verify
                </a>
                <div style="margin-top: 10px; font-size: 12px; color: #64748b; line-height: 1.6;">
                  Or copy and paste this link into your browser:<br />
                  <span style="word-break: break-all; color: #00626F">https://app.mycenta.com/verify-email</span>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 22px 26px 26px 26px; font-size: 13px; line-height: 1.7; color: #334155;">
                <div style="height: 1px; background-color: #eef2f6; margin-bottom: 18px;"></div>
                <p style="margin: 0 0 14px 0">If you did not initiate this request, please ignore this email.</p>
                <p style="margin: 0">
                  Welcome to smarter hiring,<br />
                  <strong>The My Centa Team</strong>
                </p>
                <p style="margin: 16px 0 0 0; font-size: 12px; color: #64748b">
                  Powered by <strong style="color: #0f172a">My Centa</strong>
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
exports.emailVerificationHtml = emailVerificationHtml;
//# sourceMappingURL=email-verification.html.js.map