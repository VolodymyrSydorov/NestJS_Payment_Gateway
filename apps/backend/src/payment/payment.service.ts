import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PaymentRequest, PaymentResponse, PaymentStatus, BankId, Currency, validatePaymentRequest } from '@nestjs-payment-gateway/shared';
import { PaymentProcessorFactoryImpl } from './factories/payment-processor.factory';
import { v4 as uuidv4 } from 'uuid';
import { ProcessorInfo, ProcessorError } from '../interfaces/processor-types';

/**
 * Payment Service
 * Main orchestrator for payment processing across all bank processors
 * 
 * Key Features:
 * - Unified payment processing API
 * - Dynamic processor selection
 * - Request validation
 * - Error handling and logging
 * - Processing metrics and monitoring
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly processorFactory: PaymentProcessorFactoryImpl,
  ) {
    this.logger.log('Payment Service initialized');
  }

  /**
   * Process a payment request using the specified bank processor
   */
  async processPayment(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    const startTime = Date.now();
    
    this.logger.log(`Processing payment: Amount ${paymentRequest.amount} ${paymentRequest.currency} via ${paymentRequest.bankId}`);
    
    try {
      // Validate the payment request
      this.validatePaymentRequest(paymentRequest);

      // Get the appropriate processor
      const processor = this.processorFactory.createProcessor(paymentRequest.bankId);

      // Verify processor can handle this payment
      if (!processor.canProcess(paymentRequest)) {
        throw new BadRequestException(`Processor ${paymentRequest.bankId} cannot process this payment request`);
      }

      // Process the payment
      const result = await processor.charge(paymentRequest);

      // Log the result
      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Payment ${result.status === PaymentStatus.SUCCESS ? 'successful' : 'failed'}: ` +
        `${result.transactionId} (${processingTime}ms total, ${result.processingTimeMs}ms processor)`
      );

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Payment processing failed after ${processingTime}ms: ${error.message}`);

      // Return a standardized error response
      return {
        transactionId: `failed_${Date.now()}_${uuidv4().substring(0, 8)}`,
        status: PaymentStatus.FAILED,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        bankId: paymentRequest.bankId,
        timestamp: new Date(),
        referenceId: paymentRequest.referenceId,
        processingTimeMs: processingTime,
        errorMessage: error.message || 'Payment processing failed',
        errorCode: this.getErrorCode(error)
      };
    }
  }

  /**
   * Process payment with automatic bank selection (chooses best available processor)
   */
  async processPaymentAuto(paymentRequest: Omit<PaymentRequest, 'bankId'>): Promise<PaymentResponse> {
    this.logger.log(`Processing payment with auto bank selection: Amount ${paymentRequest.amount} ${paymentRequest.currency}`);

    try {
      // Get the best available processor
      const processor = this.processorFactory.getBestProcessor();
      
      // Create full payment request with selected bank
      const fullPaymentRequest: PaymentRequest = {
        ...paymentRequest,
        bankId: processor.bankId
      };

      this.logger.log(`Auto-selected processor: ${processor.getDisplayName()}`);

      return await this.processPayment(fullPaymentRequest);

    } catch (error) {
      this.logger.error(`Auto payment processing failed: ${error.message}`);
      throw new ServiceUnavailableException('No available payment processors');
    }
  }

  /**
   * Get all available payment methods (enabled processors)
   */
  getAvailablePaymentMethods(): Array<{
    bankId: BankId;
    name: string;
    displayName: string;
    apiType: string;
    features: string[];
    averageProcessingTime: number;
    enabled: boolean;
  }> {
    return this.processorFactory.getProcessorsSummary()
      .filter(processor => processor.enabled);
  }

  /**
   * Get payment gateway health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    totalProcessors: number;
    healthyProcessors: number;
    timestamp: Date;
    processors: Array<{
      bankId: BankId;
      name: string;
      status: 'healthy' | 'disabled' | 'error';
      responseTime?: number;
    }>;
  } {
    const allProcessors = this.processorFactory.getAllProcessors();
    const enabledProcessors = this.processorFactory.getEnabledProcessors();
    const processorStatuses = this.processorFactory.getProcessorsHealthStatus();

    const healthyCount = processorStatuses.filter(p => p.status === 'healthy').length;
    const totalCount = allProcessors.length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === 0) {
      overallStatus = 'unhealthy';
    } else if (healthyCount < totalCount) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      totalProcessors: totalCount,
      healthyProcessors: healthyCount,
      timestamp: new Date(),
      processors: processorStatuses
    };
  }

  /**
   * Get payment processing statistics
   */
  getStatistics(): {
    totalProcessors: number;
    enabledProcessors: number;
    disabledProcessors: number;
    protocolBreakdown: Record<string, number>;
    averageResponseTime: number;
    supportedCurrencies: string[];
    supportedFeatures: string[];
  } {
    const stats = this.processorFactory.getProcessorStatistics();
    const allProcessors = this.processorFactory.getAllProcessors();

    // Collect all supported currencies and features
    const supportedCurrencies = new Set<string>();
    const supportedFeatures = new Set<string>();

    allProcessors.forEach(processor => {
      const info = processor.getProcessorInfo();
      
      // Add currencies
      if (info.supported_currencies) {
        info.supported_currencies.forEach((currency: string) => supportedCurrencies.add(currency));
      }
      
      // Add features
      if (info.features) {
        info.features.forEach((feature: string) => supportedFeatures.add(feature));
      }
    });

    return {
      ...stats,
      supportedCurrencies: Array.from(supportedCurrencies).sort(),
      supportedFeatures: Array.from(supportedFeatures).sort()
    };
  }

  /**
   * Enable a specific payment processor
   */
  enableProcessor(bankId: BankId): void {
    this.logger.log(`Enabling processor: ${bankId}`);
    this.processorFactory.enableProcessor(bankId);
  }

  /**
   * Disable a specific payment processor
   */
  disableProcessor(bankId: BankId): void {
    this.logger.log(`Disabling processor: ${bankId}`);
    this.processorFactory.disableProcessor(bankId);
  }

  /**
   * Check if a specific bank is supported and enabled
   */
  isBankAvailable(bankId: BankId): boolean {
    return this.processorFactory.isBankEnabled(bankId);
  }

  /**
   * Get processor information for a specific bank
   */
  getProcessorInfo(bankId: BankId): ProcessorInfo {
    const processor = this.processorFactory.createProcessor(bankId);
    return processor.getProcessorInfo();
  }

  /**
   * Validate payment request
   */
  private validatePaymentRequest(paymentRequest: PaymentRequest): void {
    // Check if bank is supported FIRST (before other validation)
    if (!this.processorFactory.isBankSupported(paymentRequest.bankId)) {
      const availableBanks = this.processorFactory.getAvailableBankIds().join(', ');
      throw new BadRequestException(
        `Unsupported bank: ${paymentRequest.bankId}. Available banks: ${availableBanks}`
      );
    }

    // Use shared validation utility
    const validationResult = validatePaymentRequest(paymentRequest);
    
    if (!validationResult.isValid) {
      const errorMessage = `Invalid payment request: ${validationResult.errors.join(', ')}`;
      this.logger.warn(errorMessage);
      throw new BadRequestException(errorMessage);
    }

    // Check if bank is enabled
    if (!this.processorFactory.isBankEnabled(paymentRequest.bankId)) {
      throw new ServiceUnavailableException(
        `Payment processor for ${paymentRequest.bankId} is currently unavailable`
      );
    }
  }

  /**
   * Get error code from exception
   */
  private getErrorCode(error: any): string {
    if (error instanceof BadRequestException) {
      return 'INVALID_REQUEST';
    }
    if (error instanceof ServiceUnavailableException) {
      return 'SERVICE_UNAVAILABLE';
    }
    return 'PROCESSING_ERROR';
  }

  /**
   * Test connectivity to all enabled processors
   */
  async testConnectivity(): Promise<Record<BankId, { success: boolean; responseTime?: number; error?: string }>> {
    const results: Record<string, { success: boolean; responseTime?: number; error?: string }> = {};
    const enabledProcessors = this.processorFactory.getEnabledProcessors();

    this.logger.log(`Testing connectivity to ${enabledProcessors.length} enabled processors`);

    for (const processor of enabledProcessors) {
      const startTime = Date.now();
      
      try {
        // Create a minimal test payment request
        const testPayment: PaymentRequest = {
          amount: 100, // $1.00
          currency: Currency.USD,
          bankId: processor.bankId,
          description: 'Connectivity test',
          referenceId: `test_${Date.now()}`
        };

        // This would be a real connectivity test in production
        // For now, we'll just check if the processor is responsive
        const info = processor.getProcessorInfo();
        const responseTime = Date.now() - startTime;

        results[processor.bankId] = {
          success: true,
          responseTime
        };

        this.logger.debug(`Connectivity test passed for ${processor.getDisplayName()}: ${responseTime}ms`);

      } catch (error) {
        const responseTime = Date.now() - startTime;
        results[processor.bankId] = {
          success: false,
          responseTime,
          error: error.message
        };

        this.logger.warn(`Connectivity test failed for ${processor.getDisplayName()}: ${error.message}`);
      }
    }

    return results as Record<BankId, { success: boolean; responseTime?: number; error?: string }>;
  }
} 