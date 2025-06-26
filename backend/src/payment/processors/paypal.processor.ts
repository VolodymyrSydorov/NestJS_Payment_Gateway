import { Injectable } from '@nestjs/common';
import { PaymentRequest, PaymentResponse, BankId, BANK_DISPLAY_NAMES } from '../../../../shared';
import { BasePaymentProcessor } from './base-payment.processor';
import { PayPalMockService, PayPalSoapResponse } from '../mocks/paypal-mock.service';

/**
 * PayPal Payment Processor
 * Handles payments through PayPal SOAP API (simulated)
 */
@Injectable()
export class PayPalProcessor extends BasePaymentProcessor {
  
  constructor(private paypalMockService: PayPalMockService) {
    super(BankId.PAYPAL, {
      bankId: BankId.PAYPAL,
      apiUrl: 'https://api-3t.sandbox.paypal.com/nvp',
      apiKey: 'paypal_mock_api_key',
      enabled: true,
      timeoutMs: 10000, // PayPal can be slower
      config: {
        username: 'paypal_api_username',
        password: 'paypal_api_password',
        signature: 'paypal_api_signature'
      }
    });
  }

  /**
   * Process payment through PayPal SOAP API (simulated)
   */
  async charge(payload: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Simulate network delay (PayPal SOAP is slower)
      await this.simulateNetworkDelay();

      // Determine if payment should succeed based on realistic success rate
      const isSuccess = this.shouldSimulateSuccess();

      // Generate mock PayPal SOAP XML response
      const soapXml = this.paypalMockService.generateSoapResponse(payload, isSuccess);

      // Parse SOAP response back to object for processing
      const paypalResponse = this.paypalMockService.parseSoapResponse(soapXml);

      // Transform PayPal response to our unified format
      return this.transformPayPalResponse(paypalResponse, payload, soapXml);

    } catch (error) {
      return this.createErrorResponse(
        payload,
        'PayPal SOAP API error occurred',
        'PAYPAL_SOAP_ERROR'
      );
    }
  }

  /**
   * Get display name for PayPal
   */
  getDisplayName(): string {
    return BANK_DISPLAY_NAMES[BankId.PAYPAL];
  }

  /**
   * Transform PayPal SOAP response to our unified PaymentResponse format
   */
  private transformPayPalResponse(
    paypalResponse: PayPalSoapResponse,
    payload: PaymentRequest,
    soapXml: string
  ): PaymentResponse {
    if (paypalResponse.ack === 'Success' && paypalResponse.paymentStatus === 'Completed') {
      return this.createSuccessResponse(payload, {
        originalTransactionId: paypalResponse.transactionId,
        paypalTransactionId: paypalResponse.transactionId,
        correlationId: paypalResponse.correlationId,
        paymentStatus: paypalResponse.paymentStatus,
        paymentType: paypalResponse.paymentType,
        protectionEligibility: paypalResponse.protectionEligibility,
        soapResponse: soapXml, // Include full SOAP for debugging
        ack: paypalResponse.ack,
        timestamp: paypalResponse.timestamp
      });
    } else {
      return this.createErrorResponse(
        payload,
        paypalResponse.errorMessage || 'PayPal payment failed',
        paypalResponse.errorCode || 'PAYPAL_FAILURE'
      );
    }
  }
} 