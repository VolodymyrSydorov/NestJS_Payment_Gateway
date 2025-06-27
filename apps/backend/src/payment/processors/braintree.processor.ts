import { Injectable, Logger } from '@nestjs/common';
import { PaymentRequest, PaymentResponse, PaymentStatus, BankId, BankConfig, Currency } from '@nestjs-payment-gateway/shared';
import { BasePaymentProcessor } from './base-payment.processor';
import { BraintreeMockService, BraintreeGraphQLResponse } from '../mocks/braintree-mock.service';
import { MOCK_API_KEYS, MOCK_TEST_DATA, MOCK_URLS } from '../../config/mocks';

/**
 * Braintree Payment Processor
 * Handles Braintree GraphQL API integration with mutations and queries
 * 
 * Key Braintree Features:
 * - GraphQL mutations for payment processing
 * - Advanced fraud detection and risk scoring
 * - PayPal integration (owned by PayPal)
 * - Dollar-based pricing (not cents)
 * - Comprehensive transaction status tracking
 * - Built-in recurring payments support
 */
@Injectable()
export class BraintreeProcessor extends BasePaymentProcessor {
  private readonly logger = new Logger(BraintreeProcessor.name);
  protected readonly processorName = 'Braintree';
  protected readonly averageProcessingTime = 400; // Braintree GraphQL ~400ms

  constructor(private readonly braintreeMockService: BraintreeMockService) {
    super(BankId.BRAINTREE, {
      bankId: BankId.BRAINTREE,
      apiUrl: 'https://payments.sandbox.braintree-api.com/graphql',
      apiKey: MOCK_API_KEYS.braintree,
      enabled: true,
      timeoutMs: 30000
    });
    this.logger.log('Braintree Payment Processor initialized');
  }

  /**
   * Get the display name for this processor
   */
  getDisplayName(): string {
    return 'Braintree Payments (PayPal)';
  }

  /**
   * Main charge method required by base class
   */
  async charge(payload: PaymentRequest): Promise<PaymentResponse> {
    return this.processPaymentInternal(payload);
  }

  /**
   * Process payment using Braintree GraphQL API format
   */
  protected async processPaymentInternal(payload: PaymentRequest): Promise<PaymentResponse> {
    const startTime = Date.now();
    
    this.logger.debug(`Processing Braintree GraphQL payment for $${(payload.amount / 100).toFixed(2)} ${payload.currency}`);

    try {
      // Generate GraphQL mutation
      const mutation = this.braintreeMockService.generatePaymentMutation();
      
      // Generate GraphQL variables
      const variables = this.braintreeMockService.generatePaymentVariables(payload);
      
      // Get required headers
      const headers = this.braintreeMockService.getRequiredHeaders();
      
      // Create GraphQL request body
      const graphqlRequest = {
        query: mutation,
        variables: variables,
        operationName: 'ChargePaymentMethod'
      };
      
      this.logger.debug(`Braintree GraphQL Request: ${JSON.stringify(graphqlRequest)}`);
      this.logger.debug(`Braintree Headers: ${JSON.stringify(headers)}`);

      // Simulate network delay (GraphQL processing overhead)
      await this.simulateNetworkDelay();

      // Always succeed (create explicit failure tests if needed)
      const braintreeResponse = this.braintreeMockService.generatePaymentResponse(payload, true);

      // Transform Braintree response to our unified format
      const unifiedResponse = this.transformBraintreeResponse(braintreeResponse, payload, startTime);
      
      this.logger.debug(`Braintree GraphQL Response: ${JSON.stringify(braintreeResponse)}`);
      this.logger.log(`Braintree payment successful: ${unifiedResponse.transactionId}`);

      return unifiedResponse;

    } catch (error) {
      this.logger.error(`Braintree payment processing failed: ${error.message}`);
      
      return {
        transactionId: this.generateTransactionId(),
        status: PaymentStatus.FAILED,
        amount: payload.amount,
        currency: payload.currency,
        bankId: this.bankId,
        timestamp: new Date(),
        referenceId: payload.referenceId,
        processingTimeMs: Date.now() - startTime,
        errorMessage: `Braintree processing error: ${error.message}`,
        errorCode: 'BRAINTREE_API_ERROR'
      };
    }
  }

  /**
   * Transform Braintree GraphQL response to unified PaymentResponse format
   */
  private transformBraintreeResponse(
    braintreeResponse: BraintreeGraphQLResponse,
    originalPayload: PaymentRequest,
    startTime: number
  ): PaymentResponse {
    const processingTime = Date.now() - startTime;
    const transaction = braintreeResponse.data?.chargePaymentMethod?.transaction;

    // Handle GraphQL errors
    if (braintreeResponse.errors && braintreeResponse.errors.length > 0) {
      const firstError = braintreeResponse.errors[0];
      return {
        transactionId: this.generateTransactionId(),
        status: PaymentStatus.FAILED,
        amount: originalPayload.amount,
        currency: originalPayload.currency,
        bankId: this.bankId,
        timestamp: new Date(),
        referenceId: originalPayload.referenceId,
        processingTimeMs: processingTime,
        errorMessage: firstError.message,
        errorCode: firstError.extensions?.code || 'GRAPHQL_ERROR'
      };
    }

    // Handle user errors from the mutation
    const userErrors = braintreeResponse.data?.chargePaymentMethod?.userErrors;
    if (userErrors && userErrors.length > 0) {
      const firstUserError = userErrors[0];
      return {
        transactionId: transaction?.legacyId || this.generateTransactionId(),
        status: PaymentStatus.FAILED,
        amount: originalPayload.amount,
        currency: originalPayload.currency,
        bankId: this.bankId,
        timestamp: new Date(),
        referenceId: originalPayload.referenceId,
        processingTimeMs: processingTime,
        errorMessage: firstUserError.message,
        errorCode: firstUserError.code
      };
    }

    // Handle successful payment
    if (transaction && (transaction.status === 'SUBMITTED_FOR_SETTLEMENT' || transaction.status === 'AUTHORIZED')) {
      return {
        transactionId: transaction.legacyId,
        status: PaymentStatus.SUCCESS,
        amount: originalPayload.amount,
        currency: originalPayload.currency,
        bankId: this.bankId,
        timestamp: new Date(transaction.createdAt),
        referenceId: originalPayload.referenceId,
        processingTimeMs: processingTime,
        bankSpecificData: {
          originalTransactionId: transaction.legacyId,
          graphqlId: transaction.id,
          authorizationCode: transaction.processorResponse?.legacyCode,
          orderId: transaction.orderId,
          braintreeStatus: transaction.status,
          merchantId: this.braintreeMockService.getMerchantId(),
          paymentMethodId: transaction.paymentMethod?.id,
          cardBrand: transaction.paymentMethod?.details?.brand,
          cardLast4: transaction.paymentMethod?.details?.last4,
          cardHolderName: transaction.paymentMethod?.details?.cardholderName,
          expirationMonth: transaction.paymentMethod?.details?.expirationMonth,
          expirationYear: transaction.paymentMethod?.details?.expirationYear,
          processorMessage: transaction.processorResponse?.message,
          cvvResponse: transaction.processorResponse?.cvvResponse,
          avsStreetResponse: transaction.processorResponse?.avsStreetAddressResponse,
          avsPostalResponse: transaction.processorResponse?.avsPostalCodeResponse,
          riskDecision: transaction.riskData?.decision,
          riskScore: transaction.riskData?.transactionRiskScore,
          amountInDollars: transaction.amount.value,
          currencyCode: transaction.amount.currencyCode
        }
      };
    }

    // Handle failed payment
    if (transaction) {
      const errorMessage = transaction.processorResponse?.message || 
                          (transaction.gatewayRejectionReason ? `Gateway rejected: ${transaction.gatewayRejectionReason}` : 'Payment failed via Braintree');

      return {
        transactionId: transaction.legacyId,
        status: this.mapBraintreeStatusToUnified(transaction.status),
        amount: originalPayload.amount,
        currency: originalPayload.currency,
        bankId: this.bankId,
        timestamp: new Date(transaction.createdAt),
        referenceId: originalPayload.referenceId,
        processingTimeMs: processingTime,
        errorMessage,
        errorCode: transaction.processorResponseCode || transaction.gatewayRejectionReason,
        bankSpecificData: {
          originalTransactionId: transaction.legacyId,
          graphqlId: transaction.id,
          braintreeStatus: transaction.status,
          merchantId: this.braintreeMockService.getMerchantId(),
          paymentMethodId: transaction.paymentMethod?.id,
          cardBrand: transaction.paymentMethod?.details?.brand,
          cardLast4: transaction.paymentMethod?.details?.last4,
          processorMessage: transaction.processorResponse?.message,
          processorResponseCode: transaction.processorResponseCode,
          processorResponseText: transaction.processorResponseText,
          gatewayRejectionReason: transaction.gatewayRejectionReason,
          cvvResponse: transaction.processorResponse?.cvvResponse,
          riskDecision: transaction.riskData?.decision,
          riskScore: transaction.riskData?.transactionRiskScore
        }
      };
    }

    // Fallback for unexpected response structure
    return {
      transactionId: this.generateTransactionId(),
      status: PaymentStatus.FAILED,
      amount: originalPayload.amount,
      currency: originalPayload.currency,
      bankId: this.bankId,
      timestamp: new Date(),
      referenceId: originalPayload.referenceId,
      processingTimeMs: processingTime,
      errorMessage: 'Unexpected response structure from Braintree GraphQL',
      errorCode: 'UNEXPECTED_RESPONSE'
    };
  }

  /**
   * Map Braintree transaction status to our unified status
   */
  private mapBraintreeStatusToUnified(braintreeStatus: string): PaymentStatus {
    switch (braintreeStatus) {
      case 'AUTHORIZED':
      case 'SUBMITTED_FOR_SETTLEMENT':
        return PaymentStatus.SUCCESS;
      case 'FAILED':
      case 'GATEWAY_REJECTED':
      case 'PROCESSOR_DECLINED':
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
      type: 'card_payment' as const,
      features: ['card_processing', 'fraud_detection', 'recurring_payments'] as any,
      supported_currencies: [Currency.USD, Currency.EUR, Currency.GBP, Currency.AUD, Currency.CAD, Currency.JPY],
      average_processing_time_ms: this.averageProcessingTime,
      protocol: 'GraphQL' as const
    };
  }
} 