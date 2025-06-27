import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PaymentRequest, PaymentResponse, PaymentStatus, BankId, ErrorCode, HealthStatus } from '@nestjs-payment-gateway/shared';
import { PaymentProcessorFactoryImpl } from './factories/payment-processor.factory';
import { v4 as uuidv4 } from 'uuid';

/**
 * Processing Service
 * Task: Unified charge method for 5 different banks with different API formats
 * Implements the main requirement: single public method 'charge'
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly processorFactory: PaymentProcessorFactoryImpl,
  ) {
    this.logger.log('Processing Service initialized with 5 bank processors');
  }

  /**
   * MAIN TASK METHOD: Unified charge method
   * Handles 5 different banks with different request/response formats
   */
  async processPayment(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    this.logger.log(`Processing payment: ${paymentRequest.amount} ${paymentRequest.currency} via ${paymentRequest.bankId}`);
    
    try {
      // Basic validation
      this.validatePaymentRequest(paymentRequest);

      // Get processor for specific bank (core task: handle different API formats)
      const processor = this.processorFactory.createProcessor(paymentRequest.bankId);

      // Process payment with bank-specific format
      const result = await processor.charge(paymentRequest);

      this.logger.log(`Payment ${result.status}: ${result.transactionId}`);
      return result;

    } catch (error) {
      this.logger.error(`Payment failed: ${error.message}`);

      // Return standardized error response
      return {
        transactionId: `failed_${Date.now()}_${uuidv4().substring(0, 8)}`,
        status: PaymentStatus.FAILED,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        bankId: paymentRequest.bankId,
        timestamp: new Date(),
        processingTimeMs: 0,
        errorMessage: error.message || 'Payment processing failed',
        errorCode: this.getErrorCode(error)
      };
    }
  }

  // ===== MINIMAL METHODS FOR FRONTEND COMPATIBILITY =====

  /**
   * Auto processor selection (frontend feature)
   */
  async processPaymentAuto(paymentRequest: Omit<PaymentRequest, 'bankId'>): Promise<PaymentResponse> {
    try {
      const processor = this.processorFactory.getBestProcessor();
      const fullRequest: PaymentRequest = { ...paymentRequest, bankId: processor.bankId };
      return this.processPayment(fullRequest);
    } catch (error) {
      this.logger.error(`Auto payment failed: ${error.message}`);
      throw new ServiceUnavailableException('No available payment processors');
    }
  }

  /**
   * Get available payment methods (frontend needs this)
   */
  getAvailablePaymentMethods(): Array<{
    bankId: BankId;
    name: string;
    enabled: boolean;
    averageProcessingTime: number;
  }> {
    return this.processorFactory.getProcessorsSummary()
      .filter(processor => processor.enabled);
  }

  /**
   * Simple health check (frontend needs this)
   */
  getHealthStatus(): {
    status: HealthStatus;
    totalProcessors: number;
    healthyProcessors: number;
    processors: Array<{ bankId: BankId; name: string; status: string; }>;
  } {
    const statuses = this.processorFactory.getProcessorsHealthStatus();
    const healthyCount = statuses.filter(p => p.status === HealthStatus.HEALTHY).length;
    const totalCount = statuses.length;

    let overallStatus: HealthStatus;
    if (healthyCount === 0) {
      overallStatus = HealthStatus.UNHEALTHY;
    } else if (healthyCount < totalCount) {
      overallStatus = HealthStatus.DEGRADED;  
    } else {
      overallStatus = HealthStatus.HEALTHY;
    }

    return {
      status: overallStatus,
      totalProcessors: totalCount,
      healthyProcessors: healthyCount,
      processors: statuses
    };
  }

  /**
   * Basic statistics (frontend needs this)
   */
  getStatistics(): {
    totalProcessors: number;
    enabledProcessors: number;
    averageResponseTime: number;
  } {
    return this.processorFactory.getProcessorStatistics();
  }

  /**
   * Enable/disable processors (admin functionality)
   */
  enableProcessor(bankId: BankId): void {
    this.processorFactory.enableProcessor(bankId);
    this.logger.log(`Enabled processor: ${bankId}`);
  }

  disableProcessor(bankId: BankId): void {
    this.processorFactory.disableProcessor(bankId);
    this.logger.log(`Disabled processor: ${bankId}`);
  }

  /**
   * Check if bank is available (frontend validation)
   */
  isBankAvailable(bankId: BankId): boolean {
    return this.processorFactory.isBankEnabled(bankId);
  }

  /**
   * Get processor info (frontend needs this)
   */
  getProcessorInfo(bankId: BankId): any {
    const processor = this.processorFactory.createProcessor(bankId);
    return processor.getProcessorInfo();
  }

  // ===== SIMPLE HELPERS =====

  /**
   * Basic request validation
   */
  private validatePaymentRequest(paymentRequest: PaymentRequest): void {
    if (!paymentRequest.amount || paymentRequest.amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    if (!paymentRequest.currency) {
      throw new BadRequestException('Currency is required');
    }

    if (!paymentRequest.bankId) {
      throw new BadRequestException('Bank ID is required');
    }

    if (!this.processorFactory.isBankSupported(paymentRequest.bankId)) {
      const available = this.processorFactory.getAvailableBankIds().join(', ');
      throw new BadRequestException(`Unsupported bank: ${paymentRequest.bankId}. Available: ${available}`);
    }

    if (!this.processorFactory.isBankEnabled(paymentRequest.bankId)) {
      throw new BadRequestException(`Bank ${paymentRequest.bankId} is currently disabled`);
    }
  }

  /**
   * Simple connectivity test (for health checks)
   */
  async testConnectivity(): Promise<Record<BankId, { success: boolean; responseTime?: number }>> {
    const enabledProcessors = this.processorFactory.getEnabledProcessors();
    const results: Record<string, any> = {};

    for (const processor of enabledProcessors) {
      const startTime = Date.now();
      try {
        // Simple test - just check if processor is responsive
        processor.getProcessorInfo();
        results[processor.bankId] = {
          success: true,
          responseTime: Date.now() - startTime
        };
      } catch (error) {
        results[processor.bankId] = {
          success: false,
          responseTime: Date.now() - startTime
        };
      }
    }

    return results;
  }

  /**
   * Get error code from exception (needed for tests)
   */
  private getErrorCode(error: any): ErrorCode {
    if (error instanceof BadRequestException) {
      return ErrorCode.INVALID_REQUEST;
    }
    if (error instanceof ServiceUnavailableException) {
      return ErrorCode.SERVICE_UNAVAILABLE;
    }
    return ErrorCode.PROCESSING_ERROR;
  }
} 