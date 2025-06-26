import { Injectable } from '@nestjs/common';
import { PaymentRequest } from '@nestjs-payment-gateway/shared';

/**
 * Simplified Stripe API Response Interface
 */
export interface StripeChargeResponse {
  id: string;
  object: string;
  amount: number;
  created: number;
  currency: string;
  description?: string;
  status: 'succeeded' | 'pending' | 'failed';
  paid: boolean;
  failure_code?: string;
  failure_message?: string;
  metadata: Record<string, string>;
  outcome?: {
    network_status: string;
    type: string;
    seller_message: string;
  };
  payment_method_details?: {
    card?: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
    type: string;
  };
}

/**
 * Stripe Mock Service
 * Simulates Stripe API responses with realistic data and behavior
 */
@Injectable()
export class StripeMockService {

  /**
   * Generate a mock Stripe charge response
   */
  generateChargeResponse(payload: PaymentRequest, isSuccess: boolean): StripeChargeResponse {
    const chargeId = `ch_${this.generateRandomId(24)}`;
    const timestamp = Math.floor(Date.now() / 1000);

    if (isSuccess) {
      return {
        id: chargeId,
        object: 'charge',
        amount: payload.amount,
        created: timestamp,
        currency: payload.currency.toLowerCase(),
        description: payload.description || 'Payment via Gateway',
        status: 'succeeded',
        paid: true,
        metadata: {
          reference_id: payload.referenceId || '',
          gateway_transaction: 'true'
        },
        outcome: {
          network_status: 'approved_by_network',
          type: 'authorized',
          seller_message: 'Payment complete.'
        },
        payment_method_details: {
          card: {
            brand: this.getRandomCardBrand(),
            last4: this.generateRandomDigits(4),
            exp_month: 12,
            exp_year: 2025
          },
          type: 'card'
        }
      };
    } else {
      // Failed payment response
      const failureReasons = [
        { code: 'card_declined', message: 'Your card was declined.' },
        { code: 'insufficient_funds', message: 'Your card has insufficient funds.' },
        { code: 'expired_card', message: 'Your card has expired.' },
        { code: 'incorrect_cvc', message: 'Your card\'s security code is incorrect.' },
        { code: 'processing_error', message: 'An error occurred while processing your card.' }
      ];
      
      const failure = failureReasons[Math.floor(Math.random() * failureReasons.length)];

      return {
        id: chargeId,
        object: 'charge',
        amount: payload.amount,
        created: timestamp,
        currency: payload.currency.toLowerCase(),
        description: payload.description || 'Payment via Gateway',
        status: 'failed',
        paid: false,
        failure_code: failure.code,
        failure_message: failure.message,
        metadata: {
          reference_id: payload.referenceId || '',
          gateway_transaction: 'true'
        },
        outcome: {
          network_status: 'declined_by_network',
          type: 'issuer_declined',
          seller_message: 'The bank declined the payment.'
        },
        payment_method_details: {
          card: {
            brand: this.getRandomCardBrand(),
            last4: this.generateRandomDigits(4),
            exp_month: 12,
            exp_year: failure.code === 'expired_card' ? 2020 : 2025
          },
          type: 'card'
        }
      };
    }
  }

  /**
   * Generate random alphanumeric ID
   */
  private generateRandomId(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random digits
   */
  private generateRandomDigits(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10).toString();
    }
    return result;
  }

  /**
   * Get random card brand
   */
  private getRandomCardBrand(): string {
    const brands = ['visa', 'mastercard', 'amex', 'discover'];
    return brands[Math.floor(Math.random() * brands.length)];
  }
} 