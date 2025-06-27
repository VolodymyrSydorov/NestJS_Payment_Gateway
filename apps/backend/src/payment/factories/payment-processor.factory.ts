import { Injectable, Logger } from '@nestjs/common';
import { PaymentProcessorFactory, PaymentProcessor, BankId, HealthStatus } from '@nestjs-payment-gateway/shared';
import { StripeProcessor } from '../processors/stripe.processor';
import { PayPalProcessor } from '../processors/paypal.processor';
import { SquareProcessor } from '../processors/square.processor';
import { AdyenProcessor } from '../processors/adyen.processor';
import { BraintreeProcessor } from '../processors/braintree.processor';

/**
 * Payment Processor Factory
 * Simple factory to create processors for 5 different banks with different API formats
 * Task: Handle 5 banks with different request/response structures
 */
@Injectable()
export class PaymentProcessorFactoryImpl implements PaymentProcessorFactory {
  private readonly logger = new Logger(PaymentProcessorFactoryImpl.name);
  private readonly processors = new Map<BankId, PaymentProcessor>();

  constructor(
    private readonly stripeProcessor: StripeProcessor,
    private readonly paypalProcessor: PayPalProcessor,
    private readonly squareProcessor: SquareProcessor,
    private readonly adyenProcessor: AdyenProcessor,
    private readonly braintreeProcessor: BraintreeProcessor,
  ) {
    this.initializeProcessors();
    this.logger.log('Payment Processor Factory initialized with 5 processors');
  }

  /**
   * Initialize processors for 5 different banks
   */
  private initializeProcessors(): void {
    this.processors.set(BankId.STRIPE, this.stripeProcessor);
    this.processors.set(BankId.PAYPAL, this.paypalProcessor);
    this.processors.set(BankId.SQUARE, this.squareProcessor);
    this.processors.set(BankId.ADYEN, this.adyenProcessor);
    this.processors.set(BankId.BRAINTREE, this.braintreeProcessor);
  }

  /**
   * Main factory method - creates processor for specific bank
   * This is the core of the task: handling different API formats
   */
  createProcessor(bankId: BankId): PaymentProcessor {
    const processor = this.processors.get(bankId);
    if (!processor) {
      const availableBanks = Array.from(this.processors.keys()).join(', ');
      throw new Error(`Unsupported bank: ${bankId}. Available: ${availableBanks}`);
    }

    if (!processor.config.enabled) {
      throw new Error(`Bank ${bankId} is currently disabled`);
    }

    return processor;
  }

  // ===== MINIMAL METHODS NEEDED FOR FRONTEND =====

  /**
   * Get all processors (needed for health check)
   */
  getAllProcessors(): PaymentProcessor[] {
    return Array.from(this.processors.values());
  }

  /**
   * Get enabled processors (needed for frontend)
   */
  getEnabledProcessors(): PaymentProcessor[] {
    return this.getAllProcessors().filter(processor => processor.config.enabled);
  }

  /**
   * Check if bank is supported (needed for validation)
   */
  isBankSupported(bankId: BankId): boolean {
    return this.processors.has(bankId);
  }

  /**
   * Check if bank is enabled (needed for validation)
   */
  isBankEnabled(bankId: BankId): boolean {
    const processor = this.processors.get(bankId);
    return processor ? processor.config.enabled : false;
  }

  /**
   * Get available bank IDs (needed for error messages)
   */
  getAvailableBankIds(): BankId[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Simple processor summary (needed for frontend processor list)
   */
  getProcessorsSummary(): Array<{
    bankId: BankId;
    name: string;
    enabled: boolean;
    averageProcessingTime: number;
  }> {
    return this.getAllProcessors().map(processor => ({
      bankId: processor.bankId,
      name: processor.getDisplayName(),
      enabled: processor.config.enabled,
      averageProcessingTime: processor.getProcessorInfo().average_processing_time_ms || 500
    }));
  }

  /**
   * Simple health status (needed for frontend health check)
   */
  getProcessorsHealthStatus(): Array<{
    bankId: BankId;
    name: string;
    status: HealthStatus;
  }> {
    return this.getAllProcessors().map(processor => ({
      bankId: processor.bankId,
      name: processor.getDisplayName(),
      status: processor.config.enabled ? HealthStatus.HEALTHY : HealthStatus.DISABLED
    }));
  }

  /**
   * Enable processor (needed for admin)
   */
  enableProcessor(bankId: BankId): void {
    const processor = this.processors.get(bankId);
    if (!processor) {
      throw new Error(`Processor not found: ${bankId}`);
    }
    processor.config.enabled = true;
    this.logger.log(`Enabled processor: ${bankId}`);
  }

  /**
   * Disable processor (needed for admin)
   */
  disableProcessor(bankId: BankId): void {
    const processor = this.processors.get(bankId);
    if (!processor) {
      throw new Error(`Processor not found: ${bankId}`);
    }
    processor.config.enabled = false;
    this.logger.log(`Disabled processor: ${bankId}`);
  }

  /**
   * Get best processor (needed for auto selection)
   * Simple implementation: return fastest processor
   */
  getBestProcessor(): PaymentProcessor {
    const enabledProcessors = this.getEnabledProcessors();
    if (enabledProcessors.length === 0) {
      throw new Error('No enabled processors available');
    }

    // Return processor with lowest processing time
    return enabledProcessors.reduce((best, current) => {
      const bestTime = best.getProcessorInfo().average_processing_time_ms || Infinity;
      const currentTime = current.getProcessorInfo().average_processing_time_ms || Infinity;
      return currentTime < bestTime ? current : best;
    });
  }

  // ===== INTERFACE COMPATIBILITY =====

  /**
   * Interface requirement - same as getAvailableBankIds
   */
  getSupportedBanks(): BankId[] {
    return this.getAvailableBankIds();
  }

  /**
   * Interface requirement - combines supported + enabled check
   */
  isSupported(bankId: BankId): boolean {
    return this.isBankSupported(bankId) && this.isBankEnabled(bankId);
  }

  /**
   * Simple statistics (needed for frontend stats)
   */
  getProcessorStatistics(): {
    totalProcessors: number;
    enabledProcessors: number;
    averageResponseTime: number;
  } {
    const allProcessors = this.getAllProcessors();
    const enabledProcessors = this.getEnabledProcessors();
    
    const totalResponseTime = allProcessors.reduce((sum, processor) => {
      return sum + (processor.getProcessorInfo().average_processing_time_ms || 500);
    }, 0);

    return {
      totalProcessors: allProcessors.length,
      enabledProcessors: enabledProcessors.length,
      averageResponseTime: Math.round(totalResponseTime / allProcessors.length)
    };
  }
} 