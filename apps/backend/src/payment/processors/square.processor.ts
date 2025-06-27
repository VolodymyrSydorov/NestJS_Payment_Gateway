import { Injectable, Logger } from '@nestjs/common';
import { PaymentRequest, PaymentResponse, PaymentStatus, BankId, BankConfig, Currency } from '@nestjs-payment-gateway/shared';
import { BasePaymentProcessor } from './base-payment.processor';
import { SquareMockService, SquarePaymentResponse } from '../mocks/square-mock.service';
import { ProcessorInfo, ProcessorFeature } from '../../interfaces/processor-types';
import { MOCK_API_KEYS, MOCK_TEST_DATA } from '../../config/mocks';
import { v4 as uuidv4 } from 'uuid';

/**
 * Square Payment Processor
 * Handles Square API integration with custom headers and idempotency management
 * 
 * Key Square Features:
 * - Required idempotency keys for duplicate prevention
 * - Custom headers (Square-Version, Authorization)
 * - Location-based processing
 * - Detailed card information and risk evaluation
 * - Processing fees calculation
 */
@Injectable()
export class SquareProcessor extends BasePaymentProcessor {
  private readonly logger = new Logger(SquareProcessor.name);
  protected readonly processorName = 'Square';
  protected readonly averageProcessingTime = 800; // Square is typically fast ~800ms

  constructor(private readonly squareMockService: SquareMockService) {
    super(BankId.SQUARE, {
      bankId: BankId.SQUARE,
      apiUrl: 'https://connect.squareupsandbox.com',
      apiKey: MOCK_API_KEYS.square,
      enabled: true,
      timeoutMs: 30000
    });
    this.logger.log('Square Payment Processor initialized');
  }

  /**
   * Get the display name for this processor
   */
  getDisplayName(): string {
    return 'Square Payments';
  }

  /**
   * Main charge method required by base class
   */
  async charge(payload: PaymentRequest): Promise<PaymentResponse> {
    return this.processPaymentInternal(payload);
  }

  /**
   * Process payment using Square API format
   */
  protected async processPaymentInternal(payload: PaymentRequest): Promise<PaymentResponse> {
    const startTime = Date.now();
    
    // Generate idempotency key for Square (required for all payments)
    const idempotencyKey = this.generateIdempotencyKey(payload);
    
    this.logger.debug(`Processing Square payment with idempotency key: ${idempotencyKey}`);
    this.logger.debug(`Square headers: ${JSON.stringify(this.squareMockService.getRequiredHeaders(idempotencyKey))}`);

    try {
      // Simulate Square API call with custom headers
      const squareRequestBody = this.squareMockService.generateRequestBody(payload, idempotencyKey);
      const squareHeaders = this.squareMockService.getRequiredHeaders(idempotencyKey);
      
      this.logger.debug(`Square Request Body: ${JSON.stringify(squareRequestBody)}`);
      this.logger.debug(`Square Request Headers: ${JSON.stringify(squareHeaders)}`);

      // Simulate network delay (Square is generally fast)
      await this.simulateNetworkDelay();

      // Always succeed (create explicit failure tests if needed)
      const squareResponse = this.squareMockService.generatePaymentResponse(
        payload, 
        true, 
        idempotencyKey
      );

      // Transform Square response to our unified format
      const unifiedResponse = this.transformSquareResponse(squareResponse, payload, startTime);
      
      this.logger.debug(`Square Response: ${JSON.stringify(squareResponse)}`);
      this.logger.log(`Square payment successful: ${unifiedResponse.transactionId}`);

      return unifiedResponse;

    } catch (error) {
      this.logger.error(`Square payment processing failed: ${error.message}`);
      
      return {
        transactionId: this.generateTransactionId(),
        status: PaymentStatus.FAILED,
        amount: payload.amount,
        currency: payload.currency,
        bankId: this.bankId,
        timestamp: new Date(),
        referenceId: payload.referenceId,
        processingTimeMs: Date.now() - startTime,
        errorMessage: `Square processing error: ${error.message}`,
        errorCode: 'SQUARE_API_ERROR'
      };
    }
  }

  /**
   * Transform Square API response to unified PaymentResponse format
   */
  private transformSquareResponse(
    squareResponse: SquarePaymentResponse,
    originalPayload: PaymentRequest,
    startTime: number
  ): PaymentResponse {
    const processingTime = Date.now() - startTime;

    // Handle successful payment
    if (squareResponse.payment && squareResponse.payment.status === 'COMPLETED') {
      return {
        transactionId: squareResponse.payment.id,
        status: PaymentStatus.SUCCESS,
        amount: originalPayload.amount,
        currency: originalPayload.currency,
        bankId: this.bankId,
        timestamp: new Date(squareResponse.payment.created_at),
        referenceId: originalPayload.referenceId,
        processingTimeMs: processingTime,
        bankSpecificData: {
          originalTransactionId: squareResponse.payment.id,
          authorizationCode: squareResponse.payment.card_details?.auth_result_code,
          receiptNumber: squareResponse.payment.receipt_number,
          receiptUrl: squareResponse.payment.receipt_url,
          locationId: squareResponse.payment.location_id,
          cardBrand: squareResponse.payment.card_details?.card.card_brand,
          cardLast4: squareResponse.payment.card_details?.card.last_4,
          cvvStatus: squareResponse.payment.card_details?.cvv_status,
          avsStatus: squareResponse.payment.card_details?.avs_status,
          riskLevel: squareResponse.payment.risk_evaluation?.risk_level,
          processingFee: squareResponse.payment.processing_fee?.[0]?.amount_money.amount,
          versionToken: squareResponse.payment.version_token
        }
      };
    }

    // Handle failed payment
    const errorMessages = squareResponse.errors?.map(error => error.detail) || ['Unknown Square error'];
    const primaryError = squareResponse.errors?.[0];

    return {
      transactionId: squareResponse.payment?.id || this.generateTransactionId(),
      status: this.mapSquareStatusToUnified(squareResponse.payment?.status),
      amount: originalPayload.amount,
      currency: originalPayload.currency,
      bankId: this.bankId,
      timestamp: squareResponse.payment?.created_at ? new Date(squareResponse.payment.created_at) : new Date(),
      referenceId: originalPayload.referenceId,
      processingTimeMs: processingTime,
      errorMessage: primaryError?.detail || 'Payment failed via Square',
      errorCode: primaryError?.code,
      bankSpecificData: {
        originalTransactionId: squareResponse.payment?.id,
        locationId: squareResponse.payment?.location_id,
        cardBrand: squareResponse.payment?.card_details?.card.card_brand,
        cardLast4: squareResponse.payment?.card_details?.card.last_4,
        errorCategory: primaryError?.category,
        cvvStatus: squareResponse.payment?.card_details?.cvv_status,
        avsStatus: squareResponse.payment?.card_details?.avs_status
      }
    };
  }

  /**
   * Map Square payment status to our unified status
   */
  private mapSquareStatusToUnified(squareStatus?: string): PaymentStatus {
    switch (squareStatus) {
      case 'COMPLETED':
        return PaymentStatus.SUCCESS;
      case 'APPROVED':
      case 'PENDING':
        return PaymentStatus.PENDING;
      case 'CANCELED':
        return PaymentStatus.CANCELLED;
      case 'FAILED':
      default:
        return PaymentStatus.FAILED;
    }
  }

  /**
   * Generate idempotency key for Square API
   * Square requires unique idempotency keys to prevent duplicate charges
   */
  private generateIdempotencyKey(payload: PaymentRequest): string {
    // Use reference ID if available, otherwise generate UUID
    const baseKey = payload.referenceId || uuidv4();
    
    // Square idempotency keys should be unique per attempt
    // Include timestamp to ensure uniqueness across retries
    const timestamp = Date.now();
    
    return `${baseKey}-${timestamp}`.substring(0, 45); // Square has 45 char limit
  }

  /**
   * Get processor configuration
   */
  getProcessorInfo(): ProcessorInfo {
    return {
      name: this.processorName,
      type: 'card_payment',
      features: [
        'card_processing',
        'fraud_detection',
        'tokenization'
      ],
      supported_currencies: [Currency.USD, Currency.CAD, Currency.GBP, Currency.EUR, Currency.AUD, Currency.JPY],
      average_processing_time_ms: this.averageProcessingTime,
      protocol: 'Custom'
    };
  }
} 