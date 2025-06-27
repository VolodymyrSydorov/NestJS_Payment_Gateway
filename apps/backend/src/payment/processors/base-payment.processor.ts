import { Injectable } from '@nestjs/common';
import { PaymentProcessor, BankConfig } from '@nestjs-payment-gateway/shared';
import { PaymentRequest, PaymentResponse, PaymentStatus, BankId } from '@nestjs-payment-gateway/shared';
import { v4 as uuidv4 } from 'uuid';
import { getProcessingTime, DEFAULT_SUPPORTED_CURRENCIES, PROCESSOR_FEATURES } from '../../config/processor-config';
import { ProcessorInfo } from '../../interfaces/processor-types';

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
    const delayMs = getProcessingTime(this.bankId);
    return new Promise(resolve => setTimeout(resolve, delayMs));
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
    return getProcessingTime(this.bankId);
  }

  /**
   * Default processor info implementation
   * Subclasses should override this with specific details
   */
  getProcessorInfo(): ProcessorInfo {
    return {
      name: this.bankId,
      type: 'card_payment',
      features: [...PROCESSOR_FEATURES.basic],
      supported_currencies: DEFAULT_SUPPORTED_CURRENCIES,
      average_processing_time_ms: this.getProcessingTime(),
      protocol: 'REST'
    };
  }
} 