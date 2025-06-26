import { Injectable } from '@nestjs/common';
import { PaymentProcessor, BankConfig } from '../../../../shared';
import { PaymentRequest, PaymentResponse, PaymentStatus, BankId } from '../../../../shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base Payment Processor
 * Abstract base class that provides common functionality for all bank processors
 */
@Injectable()
export abstract class BasePaymentProcessor implements PaymentProcessor {
  constructor(
    public readonly bankId: BankId,
    public readonly config: BankConfig
  ) {}

  /**
   * Abstract method that each bank processor must implement
   */
  abstract charge(payload: PaymentRequest): Promise<PaymentResponse>;

  /**
   * Check if this processor can handle the given payload
   */
  canProcess(payload: PaymentRequest): boolean {
    return payload.bankId === this.bankId && this.config.enabled;
  }

  /**
   * Get the display name for this processor
   */
  abstract getDisplayName(): string;

  /**
   * Simulate network delay based on bank characteristics
   */
  protected async simulateNetworkDelay(): Promise<void> {
    const delays: Record<BankId, number> = {
      [BankId.STRIPE]: 200,     // Fast REST API
      [BankId.PAYPAL]: 2000,    // Slow SOAP processing
      [BankId.SQUARE]: 500,     // Medium REST with custom headers
      [BankId.ADYEN]: 300,      // Fast but HMAC auth processing
      [BankId.BRAINTREE]: 400   // GraphQL overhead
    };

    const delayMs = delays[this.bankId] || 500;
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Generate a realistic success rate based on bank characteristics
   */
  protected shouldSimulateSuccess(): boolean {
    const successRates: Record<BankId, number> = {
      [BankId.STRIPE]: 0.95,     // 95% success rate
      [BankId.PAYPAL]: 0.85,     // 85% (SOAP complexity)
      [BankId.SQUARE]: 0.90,     // 90% success rate
      [BankId.ADYEN]: 0.92,      // 92% success rate
      [BankId.BRAINTREE]: 0.88   // 88% success rate
    };

    const successRate = successRates[this.bankId] || 0.9;
    return Math.random() < successRate;
  }

  /**
   * Generate our internal transaction ID
   */
  protected generateTransactionId(): string {
    return `TXN_${Date.now()}_${uuidv4().slice(0, 8)}`;
  }

  /**
   * Common error handling for failed payments
   */
  protected createErrorResponse(
    payload: PaymentRequest,
    errorMessage: string,
    errorCode?: string
  ): PaymentResponse {
    return {
      transactionId: this.generateTransactionId(),
      status: PaymentStatus.FAILED,
      amount: payload.amount,
      currency: payload.currency,
      bankId: this.bankId,
      timestamp: new Date(),
      errorMessage,
      errorCode,
      referenceId: payload.referenceId,
      processingTimeMs: this.getProcessingTime()
    };
  }

  /**
   * Create successful payment response
   */
  protected createSuccessResponse(
    payload: PaymentRequest,
    bankSpecificData?: any
  ): PaymentResponse {
    return {
      transactionId: this.generateTransactionId(),
      status: PaymentStatus.SUCCESS,
      amount: payload.amount,
      currency: payload.currency,
      bankId: this.bankId,
      timestamp: new Date(),
      bankSpecificData,
      referenceId: payload.referenceId,
      processingTimeMs: this.getProcessingTime()
    };
  }

  /**
   * Calculate processing time based on network delay
   */
  private getProcessingTime(): number {
    const delays: Record<BankId, number> = {
      [BankId.STRIPE]: 200,
      [BankId.PAYPAL]: 2000,
      [BankId.SQUARE]: 500,
      [BankId.ADYEN]: 300,
      [BankId.BRAINTREE]: 400
    };
    return delays[this.bankId] || 500;
  }
} 