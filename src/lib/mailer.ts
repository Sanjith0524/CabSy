import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOTPEmail(
  email: string,
  otp: string,
  type: "signup" | "login"
) {
  const isReg = type === "signup";
  const subject = isReg
    ? "[CabSy] Verify your email address"
    : "[CabSy] Complete your login verification";

  const actionText = isReg
    ? "verify your new account registration"
    : "complete your login request";

  const htmlContent = `
    <div style="font-family: 'Outfit', 'Inter', -apple-system, sans-serif; background-color: #0A0A0A; color: #FFFFFF; padding: 40px 20px; text-align: center; border-radius: 8px;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #121212; border: 1px solid #2A2A2A; border-radius: 8px; padding: 40px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5); text-align: center;">
        
        <!-- Logo -->
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #F2CA50; margin-bottom: 24px;">
          CabSy
        </div>
        
        <div style="border-top: 1px solid #2A2A2A; margin-bottom: 30px;"></div>
        
        <h2 style="font-size: 20px; font-weight: 600; margin-top: 0; color: #FFFFFF;">
          Email Verification Code
        </h2>
        
        <p style="font-size: 14px; line-height: 1.6; color: #A0A0A0; margin-bottom: 30px; margin-left: auto; margin-right: auto; max-width: 380px;">
          Please use the following 6-digit verification code to ${actionText}. This code is valid for 5 minutes.
        </p>
        
        <!-- OTP Display Box -->
        <div style="background-color: #1A1A1A; border: 1px dashed #F2CA50; border-radius: 4px; padding: 18px; font-size: 32px; font-weight: bold; font-family: monospace; letter-spacing: 6px; color: #F2CA50; margin-bottom: 30px; display: inline-block; min-width: 200px; text-align: center;">
          ${otp}
        </div>
        
        <div style="border-top: 1px solid #2A2A2A; margin-top: 30px; padding-top: 20px;">
          <p style="font-size: 11px; line-height: 1.4; color: #666666; margin: 0;">
            This email was sent automatically by CabSy. If you did not request this code, you can safely ignore this email.
          </p>
        </div>
        
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"CabSy" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    html: htmlContent,
  });
}
