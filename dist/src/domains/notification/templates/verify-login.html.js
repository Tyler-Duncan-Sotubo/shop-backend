"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyLoginHtml = void 0;
const verifyLoginHtml = (d) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CentaHR Verification Code</title>
  </head>

  <body style="margin: 0; padding: 0; background-color: #f5f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, Helvetica, sans-serif; color: #0f172a;">

    <!-- Preheader -->
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
      Use this code to verify your CentaHR account and continue your session.
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
                        alt="CentaHR"
                        height="34"
                        style="display: block; height: 34px; width: auto"
                      />
                    </td>
                    <td align="right" valign="middle" style="font-size: 12px; color: #64748b">
                      Account Verification
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Title -->
            <tr>
              <td style="padding: 6px 26px 0 26px">
                <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.2px;">Verify your account</div>
                <div style="margin-top: 6px; font-size: 13px; color: #64748b; line-height: 1.6;">Hi there,</div>
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
                  Protecting your account is one of our top priorities. Please use the verification code below to continue your session on <strong>CentaHR</strong>.
                </p>
              </td>
            </tr>

            <!-- Verification Code -->
            <tr>
              <td align="center" style="padding: 10px 26px 0 26px">
                <div style="background-color: #f8fafc; border: 1px solid #e8eef4; border-radius: 12px; padding: 18px; font-size: 26px; font-weight: 700; letter-spacing: 4px; color: #00626F; display: inline-block;">
                  ${d.verificationCode}
                </div>
              </td>
            </tr>

            <!-- Security note -->
            <tr>
              <td style="padding: 18px 26px 0 26px; font-size: 13px; color: #334155; line-height: 1.7;">
                <p style="margin: 0">If you did not initiate this request, you can safely ignore this email.</p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 22px 26px 26px 26px; font-size: 13px; line-height: 1.7; color: #334155;">
                <div style="height: 1px; background-color: #eef2f6; margin-bottom: 18px;"></div>
                <p style="margin: 0">
                  Your friends at<br />
                  <strong>CentaHR</strong>
                </p>
                <p style="margin: 16px 0 0 0; font-size: 12px; color: #64748b">
                  Powered by <strong style="color: #0f172a">CentaHR</strong>
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
exports.verifyLoginHtml = verifyLoginHtml;
//# sourceMappingURL=verify-login.html.js.map