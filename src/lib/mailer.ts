import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

type OTPType = "signup" | "login" | "reset";

const SUBJECTS: Record<OTPType, string> = {
  signup: "[CabSy] Verify your email address",
  login: "[CabSy] Complete your login verification",
  reset: "[CabSy] Reset your password",
};

const ACTION_TEXT: Record<OTPType, string> = {
  signup: "verify your new account registration",
  login: "complete your login request",
  reset: "reset your account password",
};

// ── Brand palette (mirrors the app's light theme in globals.css) ──
const C = {
  bg: "#f6f6fb",
  surface: "#ffffff",
  border: "#e7e7f1",
  primary: "#5b54e8",
  primaryContainer: "#edecfd",
  onPrimaryContainer: "#322caa",
  heading: "#191926",
  body: "#5b5b73",
  muted: "#8a8aa2",
};

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function otpEmailHtml(otp: string, actionText: string): string {
  return `
  <div style="background-color: ${C.bg}; padding: 40px 16px; font-family: ${FONT_STACK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width: 480px; max-width: 100%; border-collapse: collapse; background-color: ${C.surface}; border: 1px solid ${C.border}; border-radius: 18px; box-shadow: 0 1px 3px rgba(20,20,46,.06), 0 10px 28px -12px rgba(20,20,46,.14); overflow: hidden;">
            <tr>
              <td style="padding: 40px 40px 32px 40px; text-align: center;">

                <div style="font-size: 22px; font-weight: 700; letter-spacing: -0.01em; color: ${C.primary};">
                  CabSy
                </div>

                <div style="border-top: 1px solid ${C.border}; margin: 24px 0 28px 0;"></div>

                <h2 style="font-size: 20px; font-weight: 600; letter-spacing: -0.015em; margin: 0 0 12px 0; color: ${C.heading};">
                  Email Verification Code
                </h2>

                <p style="font-size: 14px; line-height: 1.6; color: ${C.body}; margin: 0 auto 28px auto; max-width: 380px;">
                  Please use the following 6-digit verification code to ${actionText}. This code is valid for 5 minutes.
                </p>

                <div style="display: inline-block; min-width: 220px; background-color: ${C.primaryContainer}; border: 1px solid ${C.primary}; border-radius: 12px; padding: 18px 24px; font-size: 32px; font-weight: 700; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; letter-spacing: 8px; color: ${C.onPrimaryContainer}; text-align: center;">
                  ${otp}
                </div>

                <div style="border-top: 1px solid ${C.border}; margin-top: 28px; padding-top: 20px;">
                  <p style="font-size: 11px; line-height: 1.5; color: ${C.muted}; margin: 0;">
                    This email was sent automatically by CabSy. If you did not request this code, you can safely ignore this email.
                  </p>
                </div>

              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
  `;
}

export async function sendOTPEmail(email: string, otp: string, type: OTPType) {
  await transporter.sendMail({
    from: `"CabSy" <${process.env.SMTP_USER}>`,
    to: email,
    subject: SUBJECTS[type],
    html: otpEmailHtml(otp, ACTION_TEXT[type]),
  });
}
