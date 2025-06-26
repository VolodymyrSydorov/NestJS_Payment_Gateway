import { Injectable, Logger } from '@nestjs/common';
import { PaymentRequest, PaymentResponse, PaymentStatus, BankId, BankConfig } from '../../../../shared';
import { BasePaymentProcessor } from './base-payment.processor';
import { BraintreeMockService, BraintreeGraphQLResponse } from '../mocks/braintree-mock.service';

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
      apiKey: 'test_braintree_api_key_mock',
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

      // Determine success based on our simulation
      const isSuccess = this.shouldSimulateSuccess();
      
      // Generate Braintree GraphQL response
      const braintreeResponse = this.braintreeMockService.generatePaymentResponse(payload, isSuccess);

      // Transform Braintree response to our unified format
      const unifiedResponse = this.transformBraintreeResponse(braintreeResponse, payload, startTime);
      
      this.logger.debug(`Braintree GraphQL Response: ${JSON.stringify(braintreeResponse)}`);
      this.logger.log(`Braintree payment ${isSuccess ? 'successful' : 'failed'}: ${unifiedResponse.transactionId}`);

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
      type: 'card_payment',
      api_type: 'GraphQL',
      features: [
        'graphql_mutations',
        'advanced_fraud_detection',
        'paypal_integration',
        'recurring_payments',
        'risk_scoring',
        'comprehensive_reporting',
        'multi_payment_methods',
        'sandbox_testing',
        'dollar_based_pricing',
        'transaction_status_tracking'
      ],
      supported_currencies: [
        'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK',
        'PLN', 'CZK', 'HUF', 'BRL', 'MXN', 'HKD', 'SGD', 'NZD', 'ILS', 'THB'
      ],
      supported_payment_methods: [
        'credit_cards',
        'paypal',
        'venmo',
        'apple_pay',
        'google_pay',
        'samsung_pay',
        'local_payment_methods'
      ],
      security_features: [
        'Advanced_Fraud_Detection',
        'Risk_Scoring',
        'Device_Fingerprinting',
        'Vault_Tokenization',
        '3D_Secure',
        'PCI_DSS_Level_1'
      ],
      graphql_features: [
        'mutations',
        'queries',
        'subscriptions',
        'real_time_updates',
        'batch_operations',
        'introspection'
      ],
      average_processing_time_ms: this.averageProcessingTime
    };
  }
} 