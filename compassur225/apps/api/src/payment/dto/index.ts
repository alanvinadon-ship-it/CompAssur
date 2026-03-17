export interface InitiatePaymentDto {
  subscription_id: string;
  amount: number;
  currency?: string; // default XOF
  method?: string; // mobile_money, bank_transfer, cash, card
  provider?: string; // mock, orange_money, mtn_momo, moov_money
  payer_phone: string;
  description?: string;
}

export interface PaymentCallbackDto {
  provider_ref: string;
  status: string;
  amount?: number;
  provider_timestamp?: string;
  [key: string]: any; // raw fields from provider
}

export interface CreateScheduleDto {
  subscription_id: string;
  frequency: string; // monthly, quarterly, annual
  total_installments: number;
  amount_per_installment: number;
  currency?: string;
  start_date: string; // ISO date
}

export interface UploadReceiptDto {
  payment_id: string;
  subscription_id?: string;
  file_path: string;
}
