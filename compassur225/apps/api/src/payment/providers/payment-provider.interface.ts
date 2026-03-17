/**
 * PaymentProvider – Abstraction layer for payment gateways.
 *
 * Every concrete provider (Mock, OrangeMoney, MTN MoMo, Moov Money)
 * MUST implement this interface so the PaymentService can remain
 * provider-agnostic.
 */

export interface InitiatePaymentRequest {
  /** Internal payment ID (UUID) */
  payment_id: string;
  /** Amount in minor unit (XOF has no decimals, so amount = face value) */
  amount: number;
  /** ISO 4217 currency code – always "XOF" for CI market */
  currency: string;
  /** Mobile phone number of the payer (MSISDN format) */
  payer_phone: string;
  /** Human-readable description shown to the payer */
  description: string;
  /** URL the provider should POST callback to */
  callback_url: string;
  /** Optional metadata forwarded to the provider */
  metadata?: Record<string, any>;
}

export interface InitiatePaymentResponse {
  /** Provider-side transaction reference */
  provider_ref: string;
  /** Current status after initiation */
  status: 'INITIATED' | 'PENDING' | 'PAID' | 'FAILED';
  /** If the provider returns a redirect/USSD prompt URL */
  redirect_url?: string;
  /** Raw provider response for audit */
  raw?: Record<string, any>;
}

export interface PaymentCallbackPayload {
  /** Provider-side transaction reference */
  provider_ref: string;
  /** Final status from the provider */
  status: 'PAID' | 'FAILED' | 'CANCELLED';
  /** Amount actually collected */
  amount?: number;
  /** Timestamp of the transaction on provider side */
  provider_timestamp?: string;
  /** Raw payload for audit */
  raw?: Record<string, any>;
}

export interface PaymentStatusResponse {
  provider_ref: string;
  status: 'INITIATED' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  amount?: number;
  raw?: Record<string, any>;
}

export interface PaymentProvider {
  /** Unique slug identifying the provider, e.g. "mock", "orange_money" */
  readonly name: string;

  /** Initiate a payment request to the provider */
  initiate(req: InitiatePaymentRequest): Promise<InitiatePaymentResponse>;

  /** Parse and validate a callback payload from the provider */
  parseCallback(body: Record<string, any>): PaymentCallbackPayload;

  /** Query the provider for the current status of a transaction */
  queryStatus(providerRef: string): Promise<PaymentStatusResponse>;
}
