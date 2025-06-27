import { PaymentProcessor } from './payment-processor.interface';
import { BankId } from '../enums/bank-id.enum';

/**
 * Payment Processor Factory Interface
 * Russian Task: Factory for 5 different banks with different API formats
 */
export interface PaymentProcessorFactory {
  /**
   * CORE TASK METHOD: Create processor for specific bank
   * @param bankId - Bank identifier (STRIPE, PAYPAL, SQUARE, ADYEN, BRAINTREE)
   * @returns Payment processor for handling bank-specific API format
   */
  createProcessor(bankId: BankId): PaymentProcessor;
  
  /**
   * Get all processors (minimal interface requirement)
   * @returns Array of all 5 payment processors
   */
  getAllProcessors(): PaymentProcessor[];
  
  /**
   * Get supported banks (minimal interface requirement)
   * @returns Array of all 5 supported bank IDs
   */
  getSupportedBanks(): BankId[];
  
  /**
   * Check if bank is supported and enabled (legacy compatibility)
   * @param bankId - Bank identifier to check
   * @returns true if bank is supported and enabled
   */
  isSupported(bankId: BankId): boolean;
} 