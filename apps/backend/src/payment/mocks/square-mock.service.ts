import { Injectable } from '@nestjs/common';
import { PaymentRequest } from '@nestjs-payment-gateway/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Square Payment Response Interface
 * Simulates Square's payment response structure
 */
export interface SquarePaymentResponse {
  payment?: {
    id: string;
    created_at: string;
    updated_at: string;
    amount_money: {
      amount: number;
      currency: string;
    };
    status: 'APPROVED' | 'PENDING' | 'COMPLETED' | 'CANCELED' | 'FAILED';
    delay_duration?: string;
    source_type: 'CARD';
    card_details?: {
      status: 'AUTHORIZED' | 'CAPTURED' | 'VOIDED' | 'FAILED';
      card: {
        card_brand: 'VISA' | 'MASTERCARD' | 'AMERICAN_EXPRESS' | 'DISCOVER';
        last_4: string;
        exp_month: number;
        exp_year: number;
        fingerprint: string;
      };
      entry_method: 'KEYED' | 'SWIPED' | 'EMV' | 'ON_FILE';
      cvv_status: 'CVV_ACCEPTED' | 'CVV_REJECTED' | 'CVV_NOT_CHECKED';
      avs_status: 'AVS_ACCEPTED' | 'AVS_REJECTED' | 'AVS_NOT_CHECKED';
      auth_result_code: string;
    };
    location_id: string;
    order_id?: string;
    processing_fee?: Array<{
      effective_at: string;
      type: 'INITIAL';
      amount_money: {
        amount: number;
        currency: string;
      };
    }>;
    reference_id?: string;
    note?: string;
    receipt_number: string;
    receipt_url: string;
    risk_evaluation?: {
      created_at: string;
      risk_level: 'NORMAL' | 'MODERATE' | 'HIGH';
    };
    version_token: string;
  };
  errors?: Array<{
    category: 'PAYMENT_METHOD_ERROR' | 'REFUND_ERROR' | 'MERCHANT_SUBSCRIPTION_ERROR';
    code: 'CARD_DECLINED' | 'CVV_FAILURE' | 'ADDRESS_VERIFICATION_FAILURE' | 'EXPIRED_CARD' | 'INSUFFICIENT_FUNDS';
    detail: string;
    field?: string;
  }>;
}

/**
 * Square Mock Service
 * Simulates Square API responses with realistic behavior and custom headers
 */
@Injectable()
export class SquareMockService {
  private readonly locationId = 'LH2B1Q6V7GNPG'; // Mock Square location ID

  /**
   * Generate a mock Square payment response
   */
  generatePaymentResponse(
    payload: PaymentRequest, 
    isSuccess: boolean, 
    idempotencyKey: string
  ): SquarePaymentResponse {
    const paymentId = `${idempotencyKey.replace(/-/g, '').substring(0, 16)}${Date.now()}`;
    const timestamp = new Date().toISOString();
    const receiptNumber = this.generateReceiptNumber();

    if (isSuccess) {
      return {
        payment: {
          id: paymentId,
          created_at: timestamp,
          updated_at: timestamp,
          amount_money: {
            amount: payload.amount,
            currency: payload.currency
          },
          status: 'COMPLETED',
          source_type: 'CARD',
          card_details: {
            status: 'CAPTURED',
            card: {
              card_brand: this.getRandomCardBrand(),
              last_4: this.generateRandomDigits(4),
              exp_month: 12,
              exp_year: 2025,
              fingerprint: this.generateRandomId(32)
            },
            entry_method: 'KEYED',
            cvv_status: 'CVV_ACCEPTED',
            avs_status: 'AVS_ACCEPTED',
            auth_result_code: 'tZvGUN'
          },
          location_id: this.locationId,
          processing_fee: [
            {
              effective_at: timestamp,
              type: 'INITIAL',
              amount_money: {
                amount: Math.round(payload.amount * 0.029) + 30, // Square's fee structure
                currency: payload.currency
              }
            }
          ],
          reference_id: payload.referenceId,
          note: payload.description,
          receipt_number: receiptNumber,
          receipt_url: `https://squareup.com/receipt/preview/${paymentId}`,
          risk_evaluation: {
            created_at: timestamp,
            risk_level: this.getRandomRiskLevel()
          },
          version_token: this.generateRandomId(64)
        }
      };
    } else {
      // Failed payment response
      const failureReasons = [
        { 
          category: 'PAYMENT_METHOD_ERROR' as const, 
          code: 'CARD_DECLINED' as const, 
          detail: 'Card was declined by the issuer.' 
        },
        { 
          category: 'PAYMENT_METHOD_ERROR' as const, 
          code: 'CVV_FAILURE' as const, 
          detail: 'The provided CVV does not match the card.' 
        },
        { 
          category: 'PAYMENT_METHOD_ERROR' as const, 
          code: 'EXPIRED_CARD' as const, 
          detail: 'The provided card is expired.' 
        },
        { 
          category: 'PAYMENT_METHOD_ERROR' as const, 
          code: 'INSUFFICIENT_FUNDS' as const, 
          detail: 'The card does not have sufficient funds.' 
        },
        { 
          category: 'PAYMENT_METHOD_ERROR' as const, 
          code: 'ADDRESS_VERIFICATION_FAILURE' as const, 
          detail: 'The provided address does not match the card.' 
        }
      ];

      const failure = failureReasons[Math.floor(Math.random() * failureReasons.length)];

      return {
        payment: {
          id: paymentId,
          created_at: timestamp,
          updated_at: timestamp,
          amount_money: {
            amount: payload.amount,
            currency: payload.currency
          },
          status: 'FAILED',
          source_type: 'CARD',
          card_details: {
            status: 'FAILED',
            card: {
              card_brand: this.getRandomCardBrand(),
              last_4: this.generateRandomDigits(4),
              exp_month: failure.code === 'EXPIRED_CARD' ? 11 : 12,
              exp_year: failure.code === 'EXPIRED_CARD' ? 2020 : 2025,
              fingerprint: this.generateRandomId(32)
            },
            entry_method: 'KEYED',
            cvv_status: failure.code === 'CVV_FAILURE' ? 'CVV_REJECTED' : 'CVV_ACCEPTED',
            avs_status: failure.code === 'ADDRESS_VERIFICATION_FAILURE' ? 'AVS_REJECTED' : 'AVS_ACCEPTED',
            auth_result_code: 'XXXXXX'
          },
          location_id: this.locationId,
          reference_id: payload.referenceId,
          note: payload.description,
          receipt_number: receiptNumber,
          receipt_url: `https://squareup.com/receipt/preview/${paymentId}`,
          version_token: this.generateRandomId(64)
        },
        errors: [failure]
      };
    }
  }

  /**
   * Get required Square headers for request
   */
  getRequiredHeaders(idempotencyKey: string): Record<string, string> {
    return {
      'Authorization': 'Bearer sandbox-sq0idp-mock_access_token',
      'Square-Version': '2023-10-18',
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      'User-Agent': 'Square-TypeScript-SDK/1.0.0'
    };
  }

  /**
   * Generate mock Square request body
   */
  generateRequestBody(payload: PaymentRequest, idempotencyKey: string): any {
    return {
      source_id: 'cnon:card-nonce-ok', // Mock card nonce from Square SDK
      idempotency_key: idempotencyKey,
      amount_money: {
        amount: payload.amount,
        currency: payload.currency
      },
      app_fee_money: payload.amount > 10000 ? {
        amount: Math.round(payload.amount * 0.01), // 1% app fee for large transactions
        currency: payload.currency
      } : undefined,
      autocomplete: true,
      location_id: this.locationId,
      reference_id: payload.referenceId,
      note: payload.description,
      buyer_email_address: payload.customerDetails?.email,
      billing_address: payload.customerDetails ? {
        first_name: payload.customerDetails.firstName,
        last_name: payload.customerDetails.lastName
      } : undefined,
      verification_token: this.generateRandomId(32) // CVV verification token
    };
  }

  /**
   * Generate random card brand
   */
  private getRandomCardBrand(): 'VISA' | 'MASTERCARD' | 'AMERICAN_EXPRESS' | 'DISCOVER' {
    const brands: Array<'VISA' | 'MASTERCARD' | 'AMERICAN_EXPRESS' | 'DISCOVER'> = 
      ['VISA', 'MASTERCARD', 'AMERICAN_EXPRESS', 'DISCOVER'];
    return brands[Math.floor(Math.random() * brands.length)];
  }

  /**
   * Generate random risk level
   */
  private getRandomRiskLevel(): 'NORMAL' | 'MODERATE' | 'HIGH' {
    const levels: Array<'NORMAL' | 'MODERATE' | 'HIGH'> = ['NORMAL', 'NORMAL', 'NORMAL', 'MODERATE', 'HIGH'];
    return levels[Math.floor(Math.random() * levels.length)];
  }

  /**
   * Generate Square receipt number
   */
  private generateReceiptNumber(): string {
    return `SQ${Date.now()}${this.generateRandomDigits(4)}`;
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
} 