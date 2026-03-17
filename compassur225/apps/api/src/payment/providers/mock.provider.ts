import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentProvider,
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  PaymentCallbackPayload,
  PaymentStatusResponse,
} from './payment-provider.interface';
import { randomUUID } from 'crypto';

/**
 * MockPaymentProvider – Simulates a mobile money gateway for development.
 *
 * Behaviour:
 * - initiate() always succeeds and returns PENDING
 * - queryStatus() returns PAID after a configurable delay (default: immediate)
 * - parseCallback() accepts { provider_ref, status } as-is
 *
 * This provider is selected by default when PAYMENT_PROVIDER=mock (or unset).
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  private readonly logger = new Logger(MockPaymentProvider.name);

  /** In-memory ledger for mock transactions */
  private ledger = new Map<string, { status: string; amount: number }>();

  async initiate(req: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    const providerRef = `MOCK-${randomUUID().slice(0, 8).toUpperCase()}`;
    this.logger.log(
      `[MOCK] Initiated payment ${req.payment_id} → ${providerRef} | ${req.amount} ${req.currency} | ${req.payer_phone}`,
    );
    this.ledger.set(providerRef, { status: 'PENDING', amount: req.amount });
    return {
      provider_ref: providerRef,
      status: 'PENDING',
      redirect_url: undefined,
      raw: { mock: true, provider_ref: providerRef },
    };
  }

  parseCallback(body: Record<string, any>): PaymentCallbackPayload {
    const providerRef = body.provider_ref || body.providerRef || body.transaction_id;
    const status = (body.status || 'PAID').toUpperCase();
    this.logger.log(`[MOCK] Callback received for ${providerRef} → ${status}`);
    // Update ledger
    if (this.ledger.has(providerRef)) {
      this.ledger.get(providerRef)!.status = status;
    }
    return {
      provider_ref: providerRef,
      status: status as any,
      amount: body.amount,
      provider_timestamp: new Date().toISOString(),
      raw: body,
    };
  }

  async queryStatus(providerRef: string): Promise<PaymentStatusResponse> {
    const entry = this.ledger.get(providerRef);
    if (!entry) {
      this.logger.warn(`[MOCK] Unknown provider_ref: ${providerRef}`);
      return { provider_ref: providerRef, status: 'FAILED', raw: { error: 'not_found' } };
    }
    return {
      provider_ref: providerRef,
      status: entry.status as any,
      amount: entry.amount,
      raw: { mock: true },
    };
  }

  /** Helper: simulate a successful callback (for tests / dev tooling) */
  simulateSuccess(providerRef: string): PaymentCallbackPayload {
    this.logger.log(`[MOCK] Simulating SUCCESS for ${providerRef}`);
    if (this.ledger.has(providerRef)) {
      this.ledger.get(providerRef)!.status = 'PAID';
    }
    return {
      provider_ref: providerRef,
      status: 'PAID',
      provider_timestamp: new Date().toISOString(),
      raw: { simulated: true },
    };
  }

  /** Helper: simulate a failed callback */
  simulateFailure(providerRef: string): PaymentCallbackPayload {
    this.logger.log(`[MOCK] Simulating FAILURE for ${providerRef}`);
    if (this.ledger.has(providerRef)) {
      this.ledger.get(providerRef)!.status = 'FAILED';
    }
    return {
      provider_ref: providerRef,
      status: 'FAILED',
      provider_timestamp: new Date().toISOString(),
      raw: { simulated: true },
    };
  }
}
