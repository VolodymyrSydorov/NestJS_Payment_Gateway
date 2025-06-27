import { Currency, BankId } from '@nestjs-payment-gateway/shared';

/**
 * Processor Information Interface
 * Replaces loose 'any' typing for processor info
 */
export interface ProcessorInfo {
  name: string;
  type: 'card_payment' | 'digital_wallet' | 'bank_transfer';
  features: ProcessorFeature[];
  supported_currencies: Currency[];
  average_processing_time_ms: number;
  api_version?: string;
  protocol: 'REST' | 'SOAP' | 'GraphQL' | 'Custom';
}

/**
 * Processor Features Enum
 */
export type ProcessorFeature = 
  | 'card_processing'
  | 'fraud_detection'
  | '3ds_support'
  | 'tokenization'
  | 'recurring_payments'
  | 'refunds'
  | 'disputes'
  | 'reporting';

/**
 * Mock Request Body interfaces for each processor
 */
export interface StripeRequestBody {
  amount: number;
  currency: string;
  source: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface AdyenRequestBody {
  amount: {
    value: number;
    currency: string;
  };
  merchantAccount: string;
  paymentMethod: {
    type: string;
    encryptedCardNumber: string;
    encryptedExpiryMonth: string;
    encryptedExpiryYear: string;
    encryptedSecurityCode: string;
    holderName?: string;
  };
  reference: string;
  shopperReference?: string;
  shopperEmail?: string;
  shopperIP?: string;
  shopperInteraction: string;
  returnUrl: string;
  countryCode: string;
  shopperLocale: string;
  channel: string;
  origin: string;
  additionalData?: Record<string, string>;
  browserInfo?: BrowserInfo;
  lineItems?: LineItem[];
}

export interface BraintreeRequestBody {
  input: {
    paymentMethodId: string;
    transaction: {
      amount: string;
      orderId?: string;
      options?: {
        submitForSettlement: boolean;
      };
    };
  };
}

export interface SquareRequestBody {
  source_id: string;
  idempotency_key: string;
  amount_money: {
    amount: number;
    currency: string;
  };
  app_fee_money?: {
    amount: number;
    currency: string;
  };
  autocomplete: boolean;
  location_id: string;
  reference_id?: string;
  note?: string;
  buyer_email_address?: string;
  billing_address?: {
    first_name?: string;
    last_name?: string;
  };
  verification_token?: string;
}

/**
 * Supporting interfaces
 */
export interface BrowserInfo {
  acceptHeader: string;
  colorDepth: number;
  language: string;
  javaEnabled: boolean;
  screenHeight: number;
  screenWidth: number;
  userAgent: string;
  timeZoneOffset: number;
}

export interface LineItem {
  id: string;
  description: string;
  amountIncludingTax: number;
  quantity: number;
}

/**
 * Error response interface for better error handling
 */
export interface ProcessorError {
  code: string;
  message: string;
  type: 'validation_error' | 'authentication_error' | 'processing_error' | 'network_error';
  bankId: BankId;
  timestamp: Date;
  details?: Record<string, any>;
}

/**
 * Health status interface
 */
export interface ProcessorHealthStatus {
  bankId: BankId;
  name: string;
  status: 'healthy' | 'disabled' | 'error';
  responseTime?: number;
  lastChecked: Date;
  errorMessage?: string;
} 