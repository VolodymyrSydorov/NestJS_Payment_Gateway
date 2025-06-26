import { PaymentRequest } from '../dto/charge.dto';
import { BankId } from '../enums/bank-id.enum';
import { Currency } from '../enums/currency.enum';

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validation utilities for payment data
 */
export class ValidationUtils {
  
  /**
   * Validate a payment request
   * @param paymentRequest - The payment data to validate
   * @returns Validation result with errors if any
   */
  static validatePaymentRequest(paymentRequest: PaymentRequest): ValidationResult {
    const errors: ValidationError[] = [];
    
    // Validate bank ID
    if (!paymentRequest.bankId) {
      errors.push({
        field: 'bankId',
        message: 'Bank ID is required',
        code: 'BANK_ID_REQUIRED'
      });
    } else if (!Object.values(BankId).includes(paymentRequest.bankId)) {
      errors.push({
        field: 'bankId',
        message: 'Invalid bank ID',
        code: 'INVALID_BANK_ID'
      });
    }
    
    // Validate amount
    if (!paymentRequest.amount) {
      errors.push({
        field: 'amount',
        message: 'Amount is required',
        code: 'AMOUNT_REQUIRED'
      });
    } else if (paymentRequest.amount <= 0) {
      errors.push({
        field: 'amount',
        message: 'Amount must be greater than 0',
        code: 'INVALID_AMOUNT'
      });
    } else if (paymentRequest.amount > 999999999) { // Max amount check
      errors.push({
        field: 'amount',
        message: 'Amount exceeds maximum limit',
        code: 'AMOUNT_TOO_LARGE'
      });
    }
    
    // Validate currency
    if (!paymentRequest.currency) {
      errors.push({
        field: 'currency',
        message: 'Currency is required',
        code: 'CURRENCY_REQUIRED'
      });
    } else if (!Object.values(Currency).includes(paymentRequest.currency)) {
      errors.push({
        field: 'currency',
        message: 'Invalid currency',
        code: 'INVALID_CURRENCY'
      });
    }
    
    // Validate customer email if provided
    if (paymentRequest.customerDetails?.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(paymentRequest.customerDetails.email)) {
        errors.push({
          field: 'customerDetails.email',
          message: 'Invalid email format',
          code: 'INVALID_EMAIL'
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Format amount for display (convert from cents to dollars)
   * @param amount - Amount in smallest currency unit
   * @param currency - Currency type
   * @returns Formatted amount string
   */
  static formatAmount(amount: number, currency: Currency): string {
    const displayAmount = amount / 100; // Convert from cents
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(displayAmount);
  }
  
  /**
   * Convert display amount to smallest currency unit
   * @param displayAmount - Amount in main currency unit (e.g., dollars)
   * @returns Amount in smallest currency unit (e.g., cents)
   */
  static toSmallestUnit(displayAmount: number): number {
    return Math.round(displayAmount * 100);
  }
}

/**
 * Convenience function to validate payment request
 * @param paymentRequest - The payment data to validate
 * @returns Validation result with errors if any
 */
export function validatePaymentRequest(paymentRequest: PaymentRequest): ValidationResult {
  return ValidationUtils.validatePaymentRequest(paymentRequest);
} 