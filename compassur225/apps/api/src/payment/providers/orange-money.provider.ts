import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import {
  PaymentProvider,
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  PaymentCallbackPayload,
  PaymentStatusResponse,
} from './payment-provider.interface';

/**
 * OrangeMoneyProvider – Stub for Orange Money CI integration.
 *
 * Production implementation requires:
 * - ORANGE_MONEY_MERCHANT_KEY
 * - ORANGE_MONEY_API_URL
 * - ORANGE_MONEY_RETURN_URL
 *
 * This stub throws NotImplementedException until API keys are configured.
 * The structure follows the Orange Money Web Payment API v1 contract.
 */
@Injectable()
export class OrangeMoneyProvider implements PaymentProvider {
  readonly name = 'orange_money';
  private readonly logger = new Logger(OrangeMoneyProvider.name);

  private readonly apiUrl = process.env.ORANGE_MONEY_API_URL || '';
  private readonly merchantKey = process.env.ORANGE_MONEY_MERCHANT_KEY || '';

  private get isConfigured(): boolean {
    return !!(this.apiUrl && this.merchantKey);
  }

  async initiate(req: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    if (!this.isConfigured) {
      throw new NotImplementedException(
        'Orange Money provider is not configured. Set ORANGE_MONEY_API_URL and ORANGE_MONEY_MERCHANT_KEY.',
      );
    }
    // TODO: Implement actual Orange Money API call
    // POST {apiUrl}/webpayment
    // Headers: Authorization: Bearer {merchantKey}
    // Body: { merchant_key, currency: "OUV", order_id, amount, return_url, cancel_url, notif_url, lang }
    this.logger.log(`[ORANGE] Would initiate payment for ${req.amount} ${req.currency}`);
    throw new NotImplementedException('Orange Money initiate() not yet implemented');
  }

  parseCallback(body: Record<string, any>): PaymentCallbackPayload {
    // Orange Money callback format:
    // { status: "SUCCESS"|"FAILED", txnid, amount, ... }
    const statusMap: Record<string, string> = {
      SUCCESS: 'PAID',
      FAILED: 'FAILED',
      CANCELLED: 'CANCELLED',
    };
    return {
      provider_ref: body.txnid || body.pay_token,
      status: (statusMap[body.status] || 'FAILED') as any,
      amount: body.amount ? Number(body.amount) : undefined,
      provider_timestamp: body.created_date,
      raw: body,
    };
  }

  async queryStatus(providerRef: string): Promise<PaymentStatusResponse> {
    if (!this.isConfigured) {
      throw new NotImplementedException('Orange Money provider is not configured.');
    }
    // TODO: GET {apiUrl}/webpayment/{providerRef}
    this.logger.log(`[ORANGE] Would query status for ${providerRef}`);
    throw new NotImplementedException('Orange Money queryStatus() not yet implemented');
  }
}
