export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  serviceUnavailable?: boolean;
}

/**
 * Production-ready SMS Delivery Service for CivicConnect
 * Configured via standard environment variables:
 * - SMS_PROVIDER (e.g. 'twilio', 'msg91', 'fast2sms')
 * - SMS_API_KEY
 * - SMS_API_SECRET
 * - SMS_SENDER_ID (e.g. 'CIVCON')
 */
class SmsService {
  private isConfigured: boolean = false;
  private provider: string = '';

  constructor() {
    this.checkConfiguration();
  }

  private checkConfiguration() {
    const provider = process.env.SMS_PROVIDER || '';
    const apiKey = process.env.SMS_API_KEY || '';

    if (provider && apiKey) {
      this.isConfigured = true;
      this.provider = provider.toLowerCase();
      console.log(`[CivicConnect SmsService] Configured with provider: ${this.provider}`);
    } else {
      this.isConfigured = false;
      this.provider = '';
      console.warn('[CivicConnect SmsService] No production SMS credentials configured.');
    }
  }

  public isAvailable(): boolean {
    const allowTest = process.env.ALLOW_TEST_VERIFICATION === 'true';
    return this.isConfigured || allowTest;
  }

  /**
   * Dispatch real SMS OTP to phone number
   */
  public async sendOtpSms(toPhoneNumber: string, otp: string): Promise<SmsSendResult> {
    const allowTest = process.env.ALLOW_TEST_VERIFICATION === 'true';

    // If no real provider is configured and test verification is not explicitly enabled: FAIL SAFELY
    if (!this.isConfigured && !allowTest) {
      console.error('[CivicConnect SmsService] Cannot send SMS OTP: SMS provider configuration is missing.');
      return {
        success: false,
        serviceUnavailable: true,
        error: 'Verification service is temporarily unavailable. Please try again later.'
      };
    }

    // If test mode is enabled without SMS provider credentials: log hook
    if (!this.isConfigured && allowTest) {
      console.log(`[CivicConnect SmsService (TEST HOOK)] Dispatched SMS OTP to ${toPhoneNumber}`);
      return {
        success: true,
        messageId: 'test-sms-' + Date.now()
      };
    }

    const messageText = `Your CivicConnect verification code is ${otp}. Valid for 5 minutes. Do not share this code.`;

    try {
      if (this.provider === 'twilio') {
        const accountSid = process.env.SMS_API_KEY;
        const authToken = process.env.SMS_API_SECRET;
        const fromNumber = process.env.SMS_SENDER_ID;

        if (!accountSid || !authToken || !fromNumber) {
          throw new Error('Twilio requires SMS_API_KEY (Account SID), SMS_API_SECRET (Auth Token), and SMS_SENDER_ID (From Number).');
        }

        const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const body = new URLSearchParams({
          To: toPhoneNumber,
          From: fromNumber,
          Body: messageText
        });

        const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: body.toString()
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Twilio API responded with ${response.status}: ${errText}`);
        }

        const data = await response.json();
        return { success: true, messageId: data.sid };
      } else if (this.provider === 'msg91') {
        const authKey = process.env.SMS_API_KEY;
        const senderId = process.env.SMS_SENDER_ID || 'CIVCON';
        const templateId = process.env.SMS_TEMPLATE_ID || '';

        const endpoint = 'https://api.msg91.com/api/v5/otp';
        const response = await fetch(`${endpoint}?template_id=${templateId}&mobile=${toPhoneNumber.replace('+', '')}&authkey=${authKey}&otp=${otp}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`MSG91 API responded with ${response.status}`);
        }

        const data = await response.json();
        return { success: true, messageId: data.message };
      } else if (this.provider === 'fast2sms') {
        const apiKey = process.env.SMS_API_KEY;
        const endpoint = 'https://www.fast2sms.com/dev/bulkV2';

        const cleanMobile = toPhoneNumber.replace(/^\+91/, '').replace(/\D/g, '');
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            authorization: apiKey || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: otp,
            numbers: cleanMobile
          })
        });

        if (!response.ok) {
          throw new Error(`Fast2SMS API responded with ${response.status}`);
        }

        const data = await response.json();
        return { success: true, messageId: data.request_id };
      } else {
        // Generic HTTP Webhook / Custom gateway
        const gatewayUrl = process.env.SMS_GATEWAY_URL;
        if (gatewayUrl) {
          const response = await fetch(gatewayUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': process.env.SMS_API_KEY || ''
            },
            body: JSON.stringify({
              to: toPhoneNumber,
              message: messageText,
              otp
            })
          });

          if (!response.ok) {
            throw new Error(`Custom SMS Gateway responded with ${response.status}`);
          }

          return { success: true, messageId: 'custom-sms-' + Date.now() };
        }

        throw new Error(`Unsupported SMS_PROVIDER: ${this.provider}`);
      }
    } catch (err: any) {
      console.error('[CivicConnect SmsService] Failed to send SMS:', err);
      return {
        success: false,
        serviceUnavailable: true,
        error: 'Verification service is temporarily unavailable. Please try again later.'
      };
    }
  }
}

export const smsService = new SmsService();
