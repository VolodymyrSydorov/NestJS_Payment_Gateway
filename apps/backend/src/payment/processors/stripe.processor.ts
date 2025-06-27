import { Injectable } from '@nestjs/common';
import { PaymentRequest, PaymentResponse, BankId, BANK_DISPLAY_NAMES } from '@nestjs-payment-gateway/shared';
import { BasePaymentProcessor } from './base-payment.processor';
import { StripeMockService, StripeChargeResponse } from '../mocks/stripe-mock.service';
import { getTimeout } from '../../config/processor-config';
import { MOCK_URLS, MOCK_API_KEYS } from '../../config/mocks';

/**
 * Stripe Payment Processor
 * Handles payments through Stripe API (simulated)
 */
@Injectable()
export class StripeProcessor extends BasePaymentProcessor {
  
  constructor(private stripeMockService: StripeMockService) {
    super(BankId.STRIPE, {
      bankId: BankId.STRIPE,
      apiUrl: MOCK_URLS.stripe,
      apiKey: MOCK_API_KEYS.stripe,
      enabled: true,
      timeoutMs: getTimeout(BankId.STRIPE)
    });
  }

  /**
   * Process payment through Stripe (simulated)
   */
  async charge(payload: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Simulate network delay
      await this.simulateNetworkDelay();

      // Always succeed (create explicit failure tests if needed)
      const stripeResponse = this.stripeMockService.generateChargeResponse(payload, true);

      // Transform Stripe response to our unified format
      return this.transformStripeResponse(stripeResponse, payload);

    } catch (error) {
      return this.createErrorResponse(
        payload,
        'Stripe API error occurred',
        'STRIPE_ERROR'
      );
    }
  }

  /**
   * Get display name for Stripe
   */
  getDisplayName(): string {
    return BANK_DISPLAY_NAMES[BankId.STRIPE];
  }

  /**
   * Transform Stripe API response to our unified PaymentResponse format
   */
  private transformStripeResponse(
    stripeResponse: StripeChargeResponse,
    payload: PaymentRequest
  ): PaymentResponse {
    if (stripeResponse.status === 'succeeded') {
      return this.createSuccessResponse(payload, {
        originalTransactionId: stripeResponse.id,
        stripeChargeId: stripeResponse.id,
        paymentMethodDetails: stripeResponse.payment_method_details,
        outcome: stripeResponse.outcome,
        cardBrand: stripeResponse.payment_method_details?.card?.brand,
        cardLast4: stripeResponse.payment_method_details?.card?.last4
      });
    } else {
      return this.createErrorResponse(
        payload,
        stripeResponse.failure_message || 'Payment failed',
        stripeResponse.failure_code || 'STRIPE_FAILURE'
      );
    }
  }
} 