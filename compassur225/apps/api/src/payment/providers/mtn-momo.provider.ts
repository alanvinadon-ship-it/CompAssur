import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import {
  PaymentProvider,
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  PaymentCallbackPayload,
  PaymentStatusResponse,
} from './payment-provider.interface';

/**
 * MtnMomoProvider – Stub for MTN Mobile Money CI integration.
 *
 * Production implementation requires:
 * - MTN_MOMO_API_KEY
 * - MTN_MOMO_API_USER
 * - MTN_MOMO_SUBSCRIPTION_KEY
 * - MTN_MOMO_TARGET_ENVIRONMENT (sandbox | production)
 *
 * Follows the MTN MoMo Collection API v1.0 contract.
 */
@Injectable()
export class MtnMomoProvider implements PaymentProvider {
  readonly name = 'mtn_momo';
  private readonly logger = new Logger(MtnMomoProvider.name);

  private readonly apiKey = process.env.MTN_MOMO_API_KEY || '';
  private readonly apiUser = process.env.MTN_MOMO_API_USER || '';
  private readonly subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY || '';

  private get isConfigured(): boolean {
    return !!(this.apiKey && this.apiUser && this.subscriptionKey);
  }

  async initiate(req: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    if (!this.isConfigured) {
      throw new NotImplementedException(
        'MTN MoMo provider is not configured. Set MTN_MOMO_API_KEY, MTN_MOMO_API_USER, MTN_MOMO_SUBSCRIPTION_KEY.',
      );
    }
    // TODO: Implement actual MTN MoMo Collection API call
    // POST /collection/v1_0/requesttopay
    // Headers: X-Reference-Id, X-Target-Environment, Ocp-Apim-Subscription-Key, Authorization
    // Body: { amount, currency, externalId, payer: { partyIdType: "MSISDN", partyId }, payerMessage, payeeNote }
    this.logger.log(`[MTN] Would initiate payment for ${req.amount} ${req.currency}`);
    throw new NotImplementedException('MTN MoMo initiate() not yet implemented');
  }

  parseCallback(body: Record<string, any>): PaymentCallbackPayload {
    // MTN MoMo callback format:
    // { referenceId, financialTransactionId, status: "SUCCESSFUL"|"FAILED"|"PENDING", ... }
    const statusMap: Record<string, string> = {
      SUCCESSFUL: 'PAID',
      FAILED: 'FAILED',
      PENDING: 'PENDING',
    };
    return {
      provider_ref: body.referenceId || body.financialTransactionId,
      status: (statusMap[body.status] || 'FAILED') as any,
      amount: body.amount ? Number(body.amount) : undefined,
      provider_timestamp: body.created,
      raw: body,
    };
  }

  async queryStatus(providerRef: string): Promise<PaymentStatusResponse> {
    if (!this.isConfigured) {
      throw new NotImplementedException('MTN MoMo provider is not configured.');
    }
    // TODO: GET /collection/v1_0/requesttopay/{providerRef}
    this.logger.log(`[MTN] Would query status for ${providerRef}`);
    throw new NotImplementedException('MTN MoMo queryStatus() not yet implemented');
  }
}
