import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import {
  PaymentProvider,
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  PaymentCallbackPayload,
  PaymentStatusResponse,
} from './payment-provider.interface';

/**
 * MoovMoneyProvider – Stub for Moov Money CI integration.
 *
 * Production implementation requires:
 * - MOOV_MONEY_MERCHANT_ID
 * - MOOV_MONEY_API_KEY
 * - MOOV_MONEY_API_URL
 *
 * Follows the Moov Money Merchant Payment API contract.
 */
@Injectable()
export class MoovMoneyProvider implements PaymentProvider {
  readonly name = 'moov_money';
  private readonly logger = new Logger(MoovMoneyProvider.name);

  private readonly merchantId = process.env.MOOV_MONEY_MERCHANT_ID || '';
  private readonly apiKey = process.env.MOOV_MONEY_API_KEY || '';
  private readonly apiUrl = process.env.MOOV_MONEY_API_URL || '';

  private get isConfigured(): boolean {
    return !!(this.merchantId && this.apiKey && this.apiUrl);
  }

  async initiate(req: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    if (!this.isConfigured) {
      throw new NotImplementedException(
        'Moov Money provider is not configured. Set MOOV_MONEY_MERCHANT_ID, MOOV_MONEY_API_KEY, MOOV_MONEY_API_URL.',
      );
    }
    // TODO: Implement actual Moov Money API call
    // POST {apiUrl}/payment/init
    // Body: { merchant_id, amount, currency, phone, description, callback_url }
    this.logger.log(`[MOOV] Would initiate payment for ${req.amount} ${req.currency}`);
    throw new NotImplementedException('Moov Money initiate() not yet implemented');
  }

  parseCallback(body: Record<string, any>): PaymentCallbackPayload {
    // Moov Money callback format:
    // { transaction_id, status: "SUCCESS"|"ECHEC"|"ANNULE", montant, ... }
    const statusMap: Record<string, string> = {
      SUCCESS: 'PAID',
      ECHEC: 'FAILED',
      ANNULE: 'CANCELLED',
    };
    return {
      provider_ref: body.transaction_id,
      status: (statusMap[body.status] || 'FAILED') as any,
      amount: body.montant ? Number(body.montant) : undefined,
      provider_timestamp: body.date_transaction,
      raw: body,
    };
  }

  async queryStatus(providerRef: string): Promise<PaymentStatusResponse> {
    if (!this.isConfigured) {
      throw new NotImplementedException('Moov Money provider is not configured.');
    }
    // TODO: GET {apiUrl}/payment/status/{providerRef}
    this.logger.log(`[MOOV] Would query status for ${providerRef}`);
    throw new NotImplementedException('Moov Money queryStatus() not yet implemented');
  }
}
