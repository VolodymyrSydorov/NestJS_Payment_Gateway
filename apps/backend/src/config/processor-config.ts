import { BankId, Currency } from '@nestjs-payment-gateway/shared';

/**
 * Processor Configuration Constants
 * Centralizes all timing, timeout, and URL configurations to eliminate magic numbers
 */

export const PROCESSOR_TIMEOUTS = {
  [BankId.STRIPE]: { 
    processing: 200,    // Fast REST API
    timeout: 5000       // 5 second timeout
  },
  [BankId.PAYPAL]: { 
    processing: 2000,   // Slow SOAP processing  
    timeout: 30000      // 30 second timeout for SOAP
  },
  [BankId.SQUARE]: { 
    processing: 500,    // Medium REST with custom headers
    timeout: 30000      // 30 second timeout
  },
  [BankId.ADYEN]: { 
    processing: 300,    // Fast but HMAC auth processing
    timeout: 30000      // 30 second timeout
  },
  [BankId.BRAINTREE]: { 
    processing: 400,    // GraphQL overhead
    timeout: 30000      // 30 second timeout
  }
} as const;

export const DEFAULT_PROCESSING_TIME = 500; // Fallback if bankId not found

/**
 * Common processor features by type
 */
export const PROCESSOR_FEATURES = {
  basic: ['card_processing', 'fraud_detection'],
  advanced: ['card_processing', 'fraud_detection', '3ds_support', 'tokenization'],
  enterprise: ['card_processing', 'fraud_detection', '3ds_support', 'tokenization', 'recurring_payments']
} as const;

/**
 * Default supported currencies for processors
 * Limited to consistently supported currencies across all processors
 */
export const DEFAULT_SUPPORTED_CURRENCIES: Currency[] = [
  Currency.USD, 
  Currency.EUR, 
  Currency.GBP, 
  Currency.JPY,
  Currency.AUD,
  Currency.CAD
];

/**
 * Get processing time for a specific bank
 */
export function getProcessingTime(bankId: BankId): number {
  return PROCESSOR_TIMEOUTS[bankId]?.processing ?? DEFAULT_PROCESSING_TIME;
}

/**
 * Get timeout for a specific bank
 */
export function getTimeout(bankId: BankId): number {
  return PROCESSOR_TIMEOUTS[bankId]?.timeout ?? 30000;
} 