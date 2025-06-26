import { Injectable } from '@nestjs/common';
import { PaymentRequest } from '../../../../shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Braintree GraphQL Payment Response Interface
 */
export interface BraintreeGraphQLResponse {
  data?: {
    chargePaymentMethod?: {
      transaction?: {
        id: string;
        legacyId: string;
        orderId?: string;
        createdAt: string;
        amount: {
          value: string;
          currencyCode: string;
        };
        status: 'AUTHORIZED' | 'SUBMITTED_FOR_SETTLEMENT' | 'FAILED' | 'GATEWAY_REJECTED' | 'PROCESSOR_DECLINED';
        paymentMethod?: {
          id: string;
          details?: {
            brand?: string;
            last4?: string;
            expirationMonth?: string;
            expirationYear?: string;
            cardholderName?: string;
          };
        };
        processorResponse?: {
          legacyCode: string;
          message: string;
          cvvResponse?: string;
          avsStreetAddressResponse?: string;
          avsPostalCodeResponse?: string;
        };
        riskData?: {
          decision?: 'APPROVE' | 'DECLINE' | 'REVIEW';
          transactionRiskScore?: string;
        };
        gatewayRejectionReason?: string;
        processorResponseCode?: string;
        processorResponseText?: string;
      };
      userErrors?: Array<{
        message: string;
        code: string;
      }>;
    };
  };
  errors?: Array<{
    message: string;
    extensions?: {
      code: string;
    };
  }>;
}

/**
 * Braintree Mock Service - GraphQL API simulation
 */
@Injectable()
export class BraintreeMockService {
  private readonly merchantId = 'test_merchant_braintree';

  /**
   * Generate mock Braintree GraphQL payment response
   */
  generatePaymentResponse(payload: PaymentRequest, isSuccess: boolean): BraintreeGraphQLResponse {
    const transactionId = this.generateTransactionId();
    const timestamp = new Date().toISOString();

    if (isSuccess) {
      return {
        data: {
          chargePaymentMethod: {
            transaction: {
              id: this.generateGraphQLId('Transaction', transactionId),
              legacyId: transactionId,
              orderId: payload.referenceId,
              createdAt: timestamp,
              amount: {
                value: (payload.amount / 100).toFixed(2), // Braintree uses dollars
                currencyCode: payload.currency
              },
              status: 'SUBMITTED_FOR_SETTLEMENT',
              paymentMethod: {
                id: this.generatePaymentMethodId(),
                details: {
                  brand: this.getRandomCardBrand(),
                  last4: this.generateRandomDigits(4),
                  expirationMonth: '12',
                  expirationYear: '2025',
                  cardholderName: payload.customerDetails ? 
                    `${payload.customerDetails.firstName} ${payload.customerDetails.lastName}` : 
                    'John Doe'
                }
              },
              processorResponse: {
                legacyCode: '1000',
                message: 'Approved',
                cvvResponse: 'M',
                avsStreetAddressResponse: 'Y',
                avsPostalCodeResponse: 'Y'
              },
              riskData: {
                decision: 'APPROVE',
                transactionRiskScore: Math.floor(Math.random() * 100).toString()
              }
            }
          }
        }
      };
    } else {
      const failureReasons = [
        { status: 'PROCESSOR_DECLINED' as const, code: '2000', message: 'Do Not Honor' },
        { status: 'PROCESSOR_DECLINED' as const, code: '2001', message: 'Insufficient Funds' },
        { status: 'GATEWAY_REJECTED' as const, code: 'cvv', message: 'CVV verification failed' },
        { status: 'FAILED' as const, code: '2002', message: 'Invalid Transaction' }
      ];

      const failure = failureReasons[Math.floor(Math.random() * failureReasons.length)];

      return {
        data: {
          chargePaymentMethod: {
            transaction: {
              id: this.generateGraphQLId('Transaction', transactionId),
              legacyId: transactionId,
              orderId: payload.referenceId,
              createdAt: timestamp,
              amount: {
                value: (payload.amount / 100).toFixed(2),
                currencyCode: payload.currency
              },
              status: failure.status,
              paymentMethod: {
                id: this.generatePaymentMethodId(),
                details: {
                  brand: this.getRandomCardBrand(),
                  last4: '0002',
                  expirationMonth: '12',
                  expirationYear: '2025',
                  cardholderName: 'Test User'
                }
              },
              processorResponse: {
                legacyCode: failure.code,
                message: failure.message,
                cvvResponse: failure.code === 'cvv' ? 'N' : 'M'
              },
              riskData: {
                decision: 'DECLINE',
                transactionRiskScore: '75'
              },
              gatewayRejectionReason: failure.code === 'cvv' ? 'cvv' : undefined,
              processorResponseCode: failure.code,
              processorResponseText: failure.message
            }
          }
        }
      };
    }
  }

  /**
   * Generate GraphQL mutation for payment
   */
  generatePaymentMutation(): string {
    return `
      mutation ChargePaymentMethod($input: ChargePaymentMethodInput!) {
        chargePaymentMethod(input: $input) {
          transaction {
            id
            legacyId
            orderId
            createdAt
            amount { value currencyCode }
            status
            paymentMethod {
              id
              details {
                ... on CreditCardDetails {
                  brand last4 expirationMonth expirationYear cardholderName
                }
              }
            }
            processorResponse {
              legacyCode message cvvResponse avsStreetAddressResponse avsPostalCodeResponse
            }
            riskData { decision transactionRiskScore }
            gatewayRejectionReason
            processorResponseCode
            processorResponseText
          }
          userErrors { message code }
        }
      }
    `;
  }

  /**
   * Generate GraphQL variables
   */
  generatePaymentVariables(payload: PaymentRequest): any {
    return {
      input: {
        paymentMethodId: 'fake-valid-nonce',
        transaction: {
          amount: (payload.amount / 100).toFixed(2),
          orderId: payload.referenceId,
          options: {
            submitForSettlement: true
          }
        }
      }
    };
  }

  /**
   * Get required headers
   */
  getRequiredHeaders(): Record<string, string> {
    const authString = Buffer.from('test_braintree_api_key:').toString('base64');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authString}`,
      'Braintree-Version': '2019-01-01'
    };
  }

  private generateGraphQLId(type: string, id: string): string {
    return Buffer.from(`${type}:${id}`).toString('base64');
  }

  private generateTransactionId(): string {
    return `bt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generatePaymentMethodId(): string {
    return `pm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private getRandomCardBrand(): string {
    const brands = ['Visa', 'MasterCard', 'American Express', 'Discover'];
    return brands[Math.floor(Math.random() * brands.length)];
  }

  private generateRandomDigits(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10).toString();
    }
    return result;
  }

  getMerchantId(): string {
    return this.merchantId;
  }
} 