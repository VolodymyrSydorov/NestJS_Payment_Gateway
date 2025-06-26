import { Injectable, Logger } from '@nestjs/common';
import { PaymentRequest, PaymentResponse, PaymentStatus, BankId, BankConfig } from '@nestjs-payment-gateway/shared';
import { BasePaymentProcessor } from './base-payment.processor';
import { AdyenMockService, AdyenPaymentResponse } from '../mocks/adyen-mock.service';

/**
 * Adyen Payment Processor
 * Handles Adyen API integration with HMAC signature authentication and encrypted card data
 * 
 * Key Adyen Features:
 * - HMAC signature authentication for enhanced security
 * - Encrypted card data (PCI DSS compliant)
 * - Comprehensive fraud scoring and risk management
 * - Global payment processing with local acquiring
 * - Detailed payment method information
 * - Advanced 3D Secure 2.0 support
 */
@Injectable()
export class AdyenProcessor extends BasePaymentProcessor {
  private readonly logger = new Logger(AdyenProcessor.name);
  protected readonly processorName = 'Adyen';
  protected readonly averageProcessingTime = 300; // Adyen is fast ~300ms

  constructor(private readonly adyenMockService: AdyenMockService) {
    super(BankId.ADYEN, {
      bankId: BankId.ADYEN,
      apiUrl: 'https://checkout-test.adyen.com/v71/payments',
      apiKey: 'AQE1hmfuXNWTK0Qc+iSS3VlbmY1mFGfXV2RKzeVL-mock-api-key',
      enabled: true,
      timeoutMs: 30000
    });
    this.logger.log('Adyen Payment Processor initialized');
  }

  /**
   * Get the display name for this processor
   */
  getDisplayName(): string {
    return 'Adyen Global Payments';
  }

  /**
   * Main charge method required by base class
   */
  async charge(payload: PaymentRequest): Promise<PaymentResponse> {
    return this.processPaymentInternal(payload);
  }

  /**
   * Process payment using Adyen API format
   */
  protected async processPaymentInternal(payload: PaymentRequest): Promise<PaymentResponse> {
    const startTime = Date.now();
    
    this.logger.debug(`Processing Adyen payment for amount: ${payload.amount} ${payload.currency}`);

    try {
      // Generate Adyen request body
      const adyenRequestBody = this.adyenMockService.generateRequestBody(payload);
      
      // Generate HMAC signature for authentication
      const hmacSignature = this.adyenMockService.generateHmacSignature(adyenRequestBody);
      
      // Get required Adyen headers
      const adyenHeaders = this.adyenMockService.getRequiredHeaders(hmacSignature);
      
      this.logger.debug(`Adyen Request Body: ${JSON.stringify(adyenRequestBody)}`);
      this.logger.debug(`Adyen HMAC Signature: ${hmacSignature}`);
      this.logger.debug(`Adyen Request Headers: ${JSON.stringify(adyenHeaders)}`);

      // Simulate network delay (Adyen is generally fast but thorough)
      await this.simulateNetworkDelay();

      // Always succeed (create explicit failure tests if needed)
      const adyenResponse = this.adyenMockService.generatePaymentResponse(
        payload, 
        true, 
        hmacSignature
      );

      // Transform Adyen response to our unified format
      const unifiedResponse = this.transformAdyenResponse(adyenResponse, payload, startTime);
      
      this.logger.debug(`Adyen Response: ${JSON.stringify(adyenResponse)}`);
      this.logger.log(`Adyen payment successful: ${unifiedResponse.transactionId}`);

      return unifiedResponse;

    } catch (error) {
      this.logger.error(`Adyen payment processing failed: ${error.message}`);
      
      return {
        transactionId: this.generateTransactionId(),
        status: PaymentStatus.FAILED,
        amount: payload.amount,
        currency: payload.currency,
        bankId: this.bankId,
        timestamp: new Date(),
        referenceId: payload.referenceId,
        processingTimeMs: Date.now() - startTime,
        errorMessage: `Adyen processing error: ${error.message}`,
        errorCode: 'ADYEN_API_ERROR'
      };
    }
  }

  /**
   * Transform Adyen API response to unified PaymentResponse format
   */
  private transformAdyenResponse(
    adyenResponse: AdyenPaymentResponse,
    originalPayload: PaymentRequest,
    startTime: number
  ): PaymentResponse {
    const processingTime = Date.now() - startTime;

    // Handle successful payment
    if (adyenResponse.resultCode === 'Authorised') {
      return {
        transactionId: adyenResponse.pspReference || this.generateTransactionId(),
        status: PaymentStatus.SUCCESS,
        amount: originalPayload.amount,
        currency: originalPayload.currency,
        bankId: this.bankId,
        timestamp: new Date(),
        referenceId: originalPayload.referenceId,
        processingTimeMs: processingTime,
        bankSpecificData: {
          originalTransactionId: adyenResponse.pspReference,
          authorizationCode: adyenResponse.authCode,
          merchantReference: adyenResponse.merchantReference,
          paymentMethodType: adyenResponse.paymentMethod?.type,
          cardBrand: adyenResponse.paymentMethod?.brand,
          cardLast4: adyenResponse.paymentMethod?.lastFour,
          cardHolderName: adyenResponse.paymentMethod?.holderName,
          avsResult: adyenResponse.additionalData?.['avsResult'],
          cvcResult: adyenResponse.additionalData?.['cvcResult'],
          fraudScore: adyenResponse.additionalData?.['fraudScore'],
          acquirerCode: adyenResponse.additionalData?.['acquirerCode'],
          acquirerReference: adyenResponse.additionalData?.['acquirerReference'],
          issuerCountry: adyenResponse.additionalData?.['issuerCountry'],
          networkTokenAvailable: adyenResponse.additionalData?.['networkToken.available'],
          merchantAccount: this.adyenMockService.getMerchantAccount(),
          fraudResultScore: adyenResponse.fraudResult?.accountScore
        }
      };
    }

    // Handle failed payment
    const errorMessage = adyenResponse.refusalReason || 'Payment failed via Adyen';

    return {
      transactionId: adyenResponse.pspReference || this.generateTransactionId(),
      status: this.mapAdyenStatusToUnified(adyenResponse.resultCode),
      amount: originalPayload.amount,
      currency: originalPayload.currency,
      bankId: this.bankId,
      timestamp: new Date(),
      referenceId: originalPayload.referenceId,
      processingTimeMs: processingTime,
      errorMessage,
      errorCode: adyenResponse.refusalReasonCode,
      bankSpecificData: {
        originalTransactionId: adyenResponse.pspReference,
        merchantReference: adyenResponse.merchantReference,
        resultCode: adyenResponse.resultCode,
        refusalReason: adyenResponse.refusalReason,
        refusalReasonCode: adyenResponse.refusalReasonCode,
        refusalReasonRaw: adyenResponse.additionalData?.['refusalReasonRaw'],
        paymentMethodType: adyenResponse.paymentMethod?.type,
        cardBrand: adyenResponse.paymentMethod?.brand,
        cardLast4: adyenResponse.paymentMethod?.lastFour,
        avsResult: adyenResponse.additionalData?.['avsResult'],
        cvcResult: adyenResponse.additionalData?.['cvcResult'],
        fraudScore: adyenResponse.additionalData?.['fraudScore'],
        acquirerCode: adyenResponse.additionalData?.['acquirerCode'],
        issuerCountry: adyenResponse.additionalData?.['issuerCountry'],
        merchantAccount: this.adyenMockService.getMerchantAccount()
      }
    };
  }

  /**
   * Map Adyen result code to our unified status
   */
  private mapAdyenStatusToUnified(adyenResultCode: string): PaymentStatus {
    switch (adyenResultCode) {
      case 'Authorised':
        return PaymentStatus.SUCCESS;
      case 'Pending':
      case 'Received':
        return PaymentStatus.PENDING;
      case 'Cancelled':
        return PaymentStatus.CANCELLED;
      case 'Refused':
      case 'Error':
      default:
        return PaymentStatus.FAILED;
    }
  }

  /**
   * Get processor configuration
   */
  getProcessorInfo() {
    return {
      name: this.processorName,
      type: 'card_payment',
      features: [
        'hmac_authentication',
        'encrypted_card_data',
        'fraud_scoring',
        'global_processing',
        'local_acquiring',
        '3ds2_support',
        'comprehensive_reporting',
        'real_time_notifications',
        'multi_currency',
        'risk_management'
      ],
      supported_currencies: [
        'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'SEK', 'NOK', 'DKK',
        'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RSD', 'BAM', 'MKD', 'ALL',
        'TRY', 'RUB', 'UAH', 'BYN', 'KZT', 'UZS', 'GEL', 'AMD', 'AZN', 'MDL'
      ],
      security_features: [
        'PCI_DSS_Level_1',
        'HMAC_SHA256_Authentication',
        'Client_Side_Encryption',
        'Tokenization',
        'Fraud_Detection',
        '3D_Secure_2',
        'Network_Tokenization'
      ],
      average_processing_time_ms: this.averageProcessingTime
    };
  }
} 