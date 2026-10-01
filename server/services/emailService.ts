import nodemailer from 'nodemailer';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  serviceUnavailable?: boolean;
}

/**
 * Production-ready Email Delivery Service for CivicConnect
 * Configured via standard environment variables:
 * - EMAIL_PROVIDER (e.g. 'smtp', 'sendgrid', 'resend', 'console_test')
 * - EMAIL_HOST (e.g. 'smtp.mailgun.org', 'smtp.sendgrid.net', etc.)
 * - EMAIL_PORT (e.g. 587, 465)
 * - EMAIL_USERNAME / EMAIL_USER
 * - EMAIL_PASSWORD / EMAIL_PASS
 * - EMAIL_FROM (e.g. 'CivicConnect <no-reply@civicconnect.gov>')
 */
class EmailService {
  private transporter: any = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.EMAIL_HOST;
    const port = parseInt(process.env.EMAIL_PORT || '587', 10);
    const user = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
      this.isConfigured = true;
      console.log(`[CivicConnect EmailService] Configured with host: ${host}:${port}`);
    } else {
      this.isConfigured = false;
      this.transporter = null;
      console.warn('[CivicConnect EmailService] No production SMTP credentials configured.');
    }
  }

  public isAvailable(): boolean {
    const allowTest = process.env.ALLOW_TEST_VERIFICATION === 'true';
    return this.isConfigured || allowTest;
  }

  public async sendOtpEmail(toEmail: string, otp: string, recipientName?: string): Promise<EmailSendResult> {
    const fromAddress = process.env.EMAIL_FROM || 'CivicConnect Verification <no-reply@civicconnect.gov>';
    const allowTest = process.env.ALLOW_TEST_VERIFICATION === 'true';

    // If no real provider is configured and test verification is not explicitly enabled: FAIL SAFELY
    if (!this.isConfigured && !allowTest) {
      console.error('[CivicConnect EmailService] Cannot send OTP: Email provider configuration is missing.');
      return {
        success: false,
        serviceUnavailable: true,
        error: 'Verification service is temporarily unavailable. Please try again later.'
      };
    }

    // If test mode is enabled without SMTP: deliver via test handler
    if (!this.isConfigured && allowTest) {
      console.log(`[CivicConnect EmailService (TEST HOOK)] Dispatched OTP to ${toEmail}`);
      return {
        success: true,
        messageId: 'test-email-' + Date.now()
      };
    }

    if (!this.transporter) {
      return {
        success: false,
        serviceUnavailable: true,
        error: 'Verification service is temporarily unavailable. Please try again later.'
      };
    }

    try {
      const subject = `Your CivicConnect Verification Code: ${otp}`;
      const textContent = `Hello ${recipientName || 'Resident'},\n\n` +
        `Your 6-digit CivicConnect email verification code is:\n\n` +
        `    ${otp}\n\n` +
        `This code is valid for 5 minutes and can only be used once.\n` +
        `If you did not request this verification code, please ignore this email.\n\n` +
        `CivicConnect Municipal Administration\nhttps://civicconnect.gov`;

      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px; background: #ffffff;">
          <div style="border-bottom: 2px solid #111111; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #111111; font-size: 20px; font-weight: 700;">CivicConnect</h2>
            <p style="margin: 4px 0 0; color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Municipal Verification Service</p>
          </div>
          <p style="color: #333333; font-size: 14px; line-height: 1.5;">Hello ${recipientName ? escapeHtml(recipientName) : 'Resident'},</p>
          <p style="color: #333333; font-size: 14px; line-height: 1.5;">Please use the following 6-digit verification code to verify your email address:</p>
          <div style="margin: 24px 0; text-align: center;">
            <span style="display: inline-block; font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 12px 24px; background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 6px; color: #111111;">
              ${otp}
            </span>
          </div>
          <p style="color: #666666; font-size: 12px; line-height: 1.4;">
            This code will expire in <strong>5 minutes</strong>. Never share this code with anyone. Municipal officers will never ask for your verification code.
          </p>
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eeeeee; font-size: 11px; color: #888888;">
            CivicConnect Citizen Portal &bull; Department of Municipal Administration
          </div>
        </div>
      `;

      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent
      });

      console.log(`[CivicConnect EmailService] Email sent successfully to ${toEmail}, messageId: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (err: any) {
      console.error('[CivicConnect EmailService] Error sending email:', err);
      return {
        success: false,
        serviceUnavailable: true,
        error: 'Verification service is temporarily unavailable. Please try again later.'
      };
    }
  }
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (match) => {
    switch (match) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return match;
    }
  });
}

export const emailService = new EmailService();
