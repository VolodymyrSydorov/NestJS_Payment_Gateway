import { PaymentProcessor } from './payment-processor.interface';
import { BankId } from '../enums/bank-id.enum';

/**
 * Payment Processor Factory Interface
 * Defines the contract for creating payment processors
 */
export interface PaymentProcessorFactory {
  /**
   * Create a payment processor for the specified bank
   * @param bankId - The bank identifier
   * @returns Payment processor instance
   * @throws Error if the bank is not supported or not configured
   */
  createProcessor(bankId: BankId): PaymentProcessor;
  
  /**
   * Get all available payment processors
   * @returns Array of all registered payment processors
   */
  getAllProcessors(): PaymentProcessor[];
  
  /**
   * Get all supported bank IDs
   * @returns Array of supported bank identifiers
   */
  getSupportedBanks(): BankId[];
  
  /**
   * Check if a bank is supported
   * @param bankId - The bank identifier to check
   * @returns true if the bank is supported and enabled
   */
  isSupported(bankId: BankId): boolean;
} 