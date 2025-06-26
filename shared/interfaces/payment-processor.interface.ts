import { PaymentRequest } from '../dto/charge.dto';
import { PaymentResponse } from '../dto/payment-response.dto';
import { BankId } from '../enums/bank-id.enum';

/**
 * Bank Configuration Interface
 * Defines the configuration needed for each bank processor
 */
export interface BankConfig {
  /** Bank identifier */
  bankId: BankId;
  
  /** API endpoint URL */
  apiUrl: string;
  
  /** API key or credentials */
  apiKey: string;
  
  /** Additional configuration specific to the bank */
  config?: Record<string, any>;
  
  /** Whether this bank is enabled */
  enabled: boolean;
  
  /** Timeout in milliseconds for requests */
  timeoutMs?: number;
}

/**
 * Payment Processor Interface
 * All bank processors must implement this interface
 */
export interface PaymentProcessor {
  /** Bank identifier */
  readonly bankId: BankId;
  
  /** Bank configuration */
  readonly config: BankConfig;
  
  /**
   * Process a payment charge
   * @param payload - The charge request data
   * @returns Promise resolving to payment response
   */
  charge(payload: PaymentRequest): Promise<PaymentResponse>;
  
  /**
   * Validate if the processor can handle the request
   * @param payload - The charge request data
   * @returns true if the processor can handle the request
   */
  canProcess(payload: PaymentRequest): boolean;
  
  /**
   * Get the display name for this processor
   * @returns Human-readable name of the bank
   */
  getDisplayName(): string;
} 