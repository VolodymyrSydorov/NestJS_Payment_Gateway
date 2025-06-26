import { BankId } from '../enums/bank-id.enum';
import { Currency } from '../enums/currency.enum';

/**
 * Customer Details for Payment
 */
export interface CustomerDetails {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Payment Request
 * Unified interface for payment charge requests across all banks
 */
export interface PaymentRequest {
  /** Selected bank for processing the payment */
  bankId: BankId;
  
  /** Payment amount (in smallest currency unit, e.g., cents for USD) */
  amount: number;
  
  /** Currency for the payment */
  currency: Currency;
  
  /** Optional customer information */
  customerDetails?: CustomerDetails;
  
  /** Optional description for the payment */
  description?: string;
  
  /** Optional reference ID for tracking */
  referenceId?: string;
  
  /** Optional metadata for additional information */
  metadata?: Record<string, any>;
} 