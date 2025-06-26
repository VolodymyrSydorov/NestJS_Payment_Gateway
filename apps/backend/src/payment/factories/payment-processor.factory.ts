import { Injectable, Logger } from '@nestjs/common';
import { PaymentProcessorFactory, PaymentProcessor, BankId } from '@nestjs-payment-gateway/shared';
import { StripeProcessor } from '../processors/stripe.processor';
import { PayPalProcessor } from '../processors/paypal.processor';
import { SquareProcessor } from '../processors/square.processor';
import { AdyenProcessor } from '../processors/adyen.processor';
import { BraintreeProcessor } from '../processors/braintree.processor';

/**
 * Payment Processor Factory
 * Implements the Factory Pattern to create and manage payment processors
 * 
 * Responsibilities:
 * - Dynamic processor selection based on BankId
 * - Processor availability checking
 * - Centralized processor management
 * - Load balancing capabilities (future enhancement)
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
   * Initialize all payment processors and register them in the factory
   */
  private initializeProcessors(): void {
    // Register all available processors
    this.processors.set(BankId.STRIPE, this.stripeProcessor);
    this.processors.set(BankId.PAYPAL, this.paypalProcessor);
    this.processors.set(BankId.SQUARE, this.squareProcessor);
    this.processors.set(BankId.ADYEN, this.adyenProcessor);
    this.processors.set(BankId.BRAINTREE, this.braintreeProcessor);

    this.logger.debug('Registered processors:', Array.from(this.processors.keys()));
  }

  /**
   * Create and return the appropriate payment processor for the given bank
   */
  createProcessor(bankId: BankId): PaymentProcessor {
    this.logger.debug(`Creating processor for bank: ${bankId}`);

    const processor = this.processors.get(bankId);
    if (!processor) {
      const availableBanks = Array.from(this.processors.keys()).join(', ');
      const errorMessage = `No processor found for bank: ${bankId}. Available banks: ${availableBanks}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Check if processor is enabled and configured
    if (!processor.config.enabled) {
      const errorMessage = `Processor for bank ${bankId} is currently disabled`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.debug(`Successfully created processor: ${processor.getDisplayName()}`);
    return processor;
  }

  /**
   * Get all available payment processors
   */
  getAllProcessors(): PaymentProcessor[] {
    return Array.from(this.processors.values());
  }

  /**
   * Get all enabled payment processors
   */
  getEnabledProcessors(): PaymentProcessor[] {
    return this.getAllProcessors().filter(processor => processor.config.enabled);
  }

  /**
   * Get all available bank IDs
   */
  getAvailableBankIds(): BankId[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Get all supported bank IDs (interface requirement)
   */
  getSupportedBanks(): BankId[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Get all enabled bank IDs
   */
  getEnabledBankIds(): BankId[] {
    return this.getEnabledProcessors().map(processor => processor.bankId);
  }

  /**
   * Check if a specific bank is supported
   */
  isBankSupported(bankId: BankId): boolean {
    return this.processors.has(bankId);
  }

  /**
   * Check if a bank is supported and enabled (interface requirement)
   */
  isSupported(bankId: BankId): boolean {
    return this.processors.has(bankId) && this.isBankEnabled(bankId);
  }

  /**
   * Check if a specific bank is enabled
   */
  isBankEnabled(bankId: BankId): boolean {
    const processor = this.processors.get(bankId);
    return processor ? processor.config.enabled : false;
  }

  /**
   * Get processor information for all registered processors
   */
  getProcessorsSummary(): Array<{
    bankId: BankId;
    name: string;
    displayName: string;
    enabled: boolean;
    apiType: string;
    features: string[];
    averageProcessingTime: number;
  }> {
    return this.getAllProcessors().map(processor => {
      const info = processor.getProcessorInfo();
      return {
        bankId: processor.bankId,
        name: info.name,
        displayName: processor.getDisplayName(),
        enabled: processor.config.enabled,
        apiType: info.api_type || 'REST',
        features: info.features || [],
        averageProcessingTime: info.average_processing_time_ms || 500
      };
    });
  }

  /**
   * Get health status of all processors
   */
  getProcessorsHealthStatus(): Array<{
    bankId: BankId;
    name: string;
    status: 'healthy' | 'disabled' | 'error';
    lastChecked: Date;
    responseTime?: number;
  }> {
    return this.getAllProcessors().map(processor => {
      const isEnabled = processor.config.enabled;
      const status = isEnabled ? 'healthy' : 'disabled';
      
      return {
        bankId: processor.bankId,
        name: processor.getDisplayName(),
        status,
        lastChecked: new Date(),
        responseTime: isEnabled ? processor.getProcessorInfo().average_processing_time_ms : undefined
      };
    });
  }

  /**
   * Enable a specific processor
   */
  enableProcessor(bankId: BankId): void {
    const processor = this.processors.get(bankId);
    if (!processor) {
      throw new Error(`Processor not found for bank: ${bankId}`);
    }

    processor.config.enabled = true;
    this.logger.log(`Enabled processor for bank: ${bankId}`);
  }

  /**
   * Disable a specific processor
   */
  disableProcessor(bankId: BankId): void {
    const processor = this.processors.get(bankId);
    if (!processor) {
      throw new Error(`Processor not found for bank: ${bankId}`);
    }

    processor.config.enabled = false;
    this.logger.log(`Disabled processor for bank: ${bankId}`);
  }

  /**
   * Get the best processor based on criteria (for load balancing)
   * Currently returns the processor with lowest average processing time
   */
  getBestProcessor(excludeBankIds: BankId[] = []): PaymentProcessor {
    const availableProcessors = this.getEnabledProcessors()
      .filter(processor => !excludeBankIds.includes(processor.bankId));

    if (availableProcessors.length === 0) {
      throw new Error('No enabled processors available');
    }

    // Find processor with lowest average processing time
    const bestProcessor = availableProcessors.reduce((best, current) => {
      const bestTime = best.getProcessorInfo().average_processing_time_ms || Infinity;
      const currentTime = current.getProcessorInfo().average_processing_time_ms || Infinity;
      return currentTime < bestTime ? current : best;
    });

    this.logger.debug(`Best processor selected: ${bestProcessor.getDisplayName()}`);
    return bestProcessor;
  }

  /**
   * Get processor statistics
   */
  getProcessorStatistics(): {
    totalProcessors: number;
    enabledProcessors: number;
    disabledProcessors: number;
    protocolBreakdown: Record<string, number>;
    averageResponseTime: number;
  } {
    const allProcessors = this.getAllProcessors();
    const enabledProcessors = this.getEnabledProcessors();
    
    const protocolBreakdown: Record<string, number> = {};
    let totalResponseTime = 0;

    allProcessors.forEach(processor => {
      const info = processor.getProcessorInfo();
      const apiType = info.api_type || 'REST';
      protocolBreakdown[apiType] = (protocolBreakdown[apiType] || 0) + 1;
      totalResponseTime += info.average_processing_time_ms || 500;
    });

    return {
      totalProcessors: allProcessors.length,
      enabledProcessors: enabledProcessors.length,
      disabledProcessors: allProcessors.length - enabledProcessors.length,
      protocolBreakdown,
      averageResponseTime: Math.round(totalResponseTime / allProcessors.length)
    };
  }
} 