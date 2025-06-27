import { Injectable, Logger } from '@nestjs/common';
import { PaymentRequest, PaymentResponse, PaymentStatus, ErrorCode } from '@nestjs-payment-gateway/shared';
import { PaymentProcessorFactoryImpl } from './factories/payment-processor.factory';

/**
 * ProcessingService - Core service for payment processing
 * Implements the Russian task requirement: "ProcessingService с единым публичным методом charge"
 */
@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);

  constructor(
    private readonly processorFactory: PaymentProcessorFactoryImpl,
  ) {}

  /**
   * Single public method "charge" as required by Russian task
   * Processes payment through the specified bank processor
   */
  async charge(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    this.logger.log(`Processing charge request for bank: ${paymentRequest.bankId}`);
    
    try {
      // Validate request
      if (!paymentRequest.amount || paymentRequest.amount <= 0) {
        return this.createErrorResponse(paymentRequest, 'Invalid amount: cannot be negative or zero', ErrorCode.INVALID_REQUEST);
      }
      if (!paymentRequest.currency) {
        return this.createErrorResponse(paymentRequest, 'Currency required', ErrorCode.INVALID_REQUEST);
      }

      // Check if bank is supported
      if (!this.processorFactory.isSupported(paymentRequest.bankId)) {
        return this.createErrorResponse(
          paymentRequest, 
          `Unsupported bank: ${paymentRequest.bankId}`, 
          ErrorCode.INVALID_REQUEST
        );
      }

      // Create processor and process payment
      const processor = this.processorFactory.createProcessor(paymentRequest.bankId);
      const result = await processor.charge(paymentRequest);
      
      this.logger.log(`Charge completed: ${result.status}`);
      return result;
      
    } catch (error) {
      this.logger.error(`Charge processing error: ${error.message}`, error.stack);
      return this.createErrorResponse(
        paymentRequest,
        'Payment processing failed',
        ErrorCode.PROCESSING_ERROR
      );
    }
  }

  private createErrorResponse(
    request: PaymentRequest, 
    errorMessage: string, 
    errorCode: ErrorCode
  ): PaymentResponse {
    return {
      status: PaymentStatus.FAILED,
      amount: request.amount,
      currency: request.currency,
      bankId: request.bankId,
      transactionId: '',
      processingTimeMs: 0,
      timestamp: new Date(),
      errorMessage,
      errorCode
    };
  }
} 