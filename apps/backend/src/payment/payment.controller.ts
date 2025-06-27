import { Controller, Post, Body, Logger } from '@nestjs/common';
import { PaymentRequest, PaymentResponse } from '@nestjs-payment-gateway/shared';
import { ProcessingService } from './payment.service';

/**
 * Payment Controller
 * REST API endpoints for payment gateway operations
 * 
 * Core endpoint:
 * - POST /payments/charge - Process payment with specified bank (matches Russian task)
 */
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly processingService: ProcessingService) {}

  /**
   * Charge payment using the specified bank processor
   * This is the core "charge" method required by the Russian task
   */
  @Post('charge')
  async charge(@Body() paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    this.logger.log(`Processing payment for bank: ${paymentRequest.bankId}, amount: ${paymentRequest.amount}`);
    
    try {
      const result = await this.processingService.charge(paymentRequest);
      
      this.logger.log(`Payment processed: ${result.status}, transaction: ${result.transactionId}`);
      return result;
    } catch (error) {
      this.logger.error(`Payment processing error: ${error.message}`, error.stack);
      throw error;
    }
  }
} 