import { PaymentStatus } from '../enums/payment-status.enum';
import { BankId } from '../enums/bank-id.enum';
import { Currency } from '../enums/currency.enum';

/**
 * Bank-specific response data
 * Each bank can return additional data specific to their implementation
 */
export interface BankSpecificData {
  /** Original transaction ID from the bank */
  originalTransactionId?: string;
  
  /** Bank's specific status code */
  bankStatusCode?: string;
  
  /** Authorization code from the bank */
  authorizationCode?: string;
  
  /** Additional metadata from the bank */
  [key: string]: any;
}

/**
 * Payment Response DTO
 * Unified response structure returned by all payment processors
 */
export interface PaymentResponse {
  /** Our internal transaction ID */
  transactionId: string;
  
  /** Standardized payment status */
  status: PaymentStatus;
  
  /** Payment amount (same as requested) */
  amount: number;
  
  /** Currency (same as requested) */
  currency: Currency;
  
  /** Bank that processed the payment */
  bankId: BankId;
  
  /** Timestamp when the payment was processed */
  timestamp: Date;
  
  /** Bank-specific response data */
  bankSpecificData?: BankSpecificData;
  
  /** Error message if payment failed */
  errorMessage?: string;
  
  /** Error code for programmatic handling */
  errorCode?: string;
  
  /** Reference ID from the original request */
  referenceId?: string;
  
  /** Processing time in milliseconds */
  processingTimeMs?: number;
} 