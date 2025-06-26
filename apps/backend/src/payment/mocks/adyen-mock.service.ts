import { Injectable } from '@nestjs/common';
import { PaymentRequest } from '@nestjs-payment-gateway/shared';
import { createHmac, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Adyen Payment Response Interface
 * Simulates Adyen's payment response structure
 */
export interface AdyenPaymentResponse {
  pspReference?: string;
  resultCode: 'Authorised' | 'Refused' | 'Error' | 'Cancelled' | 'Pending' | 'Received';
  authCode?: string;
  merchantReference?: string;
  paymentMethod?: {
    type: string;
    brand?: string;
    lastFour?: string;
    expiryMonth?: string;
    expiryYear?: string;
    holderName?: string;
  };
  amount?: {
    value: number;
    currency: string;
  };
  additionalData?: {
    'paymentMethod.variant'?: string;
    'authCode'?: string;
    'avsResult'?: string;
    'cvcResult'?: string;
    'fraudScore'?: string;
    'networkToken.available'?: string;
    'acquirerAccountCode'?: string;
    'acquirerCode'?: string;
    'acquirerReference'?: string;
    'alias'?: string;
    'aliasType'?: string;
    'cardSummary'?: string;
    'expiryDate'?: string;
    'issuerCountry'?: string;
    'merchantAdviceCode'?: string;
    'rawAcquirerResult'?: string;
    'refusalReasonRaw'?: string;
    'shopperInteraction'?: string;
  };
  refusalReason?: string;
  refusalReasonCode?: string;
  fraudResult?: {
    accountScore: number;
    results: Array<{
      FraudCheckResult: {
        accountScore: number;
        checkId: number;
        name: string;
      };
    }>;
  };
  merchantReturnData?: string;
  details?: Array<{
    key: string;
    type: string;
  }>;
  action?: {
    type: string;
    paymentMethodType: string;
    url?: string;
    data?: Record<string, any>;
    method?: string;
  };
}

/**
 * Adyen Mock Service
 * Simulates Adyen API responses with realistic HMAC authentication and security features
 */
@Injectable()
export class AdyenMockService {
  private readonly merchantAccount = 'TestMerchant';
  private readonly apiKey = 'AQE1hmfuXNWTK0Qc+iSS3VlbmY1mFGfXV2RKzeVL-mock-api-key';
  private readonly hmacKey = 'DFB1EB5485895CFA84146406857104ABB4CBCABDC8AAF103A624C8F6A3EAAB00';

  /**
   * Generate a mock Adyen payment response
   */
  generatePaymentResponse(
    payload: PaymentRequest,
    isSuccess: boolean,
    hmacSignature: string
  ): AdyenPaymentResponse {
    const pspReference = this.generatePspReference();
    const authCode = isSuccess ? this.generateAuthCode() : undefined;

    if (isSuccess) {
      return {
        pspReference,
        resultCode: 'Authorised',
        authCode,
        merchantReference: payload.referenceId,
        paymentMethod: {
          type: 'scheme',
          brand: this.getRandomCardBrand(),
          lastFour: this.generateRandomDigits(4),
          expiryMonth: '12',
          expiryYear: '2025',
          holderName: payload.customerDetails ? 
            `${payload.customerDetails.firstName} ${payload.customerDetails.lastName}` : 
            'JOHN DOE'
        },
        amount: {
          value: payload.amount,
          currency: payload.currency
        },
        additionalData: {
          'paymentMethod.variant': this.getRandomCardBrand().toLowerCase(),
          'authCode': authCode,
          'avsResult': this.getRandomAvsResult(),
          'cvcResult': this.getRandomCvcResult(),
          'fraudScore': Math.floor(Math.random() * 100).toString(),
          'networkToken.available': 'false',
          'acquirerAccountCode': 'TestAcquirer',
          'acquirerCode': '1234',
          'acquirerReference': this.generateAcquirerReference(),
          'cardSummary': `•••• ${this.generateRandomDigits(4)}`,
          'expiryDate': '12/2025',
          'issuerCountry': this.getRandomCountryCode(),
          'shopperInteraction': 'Ecommerce'
        },
        fraudResult: {
          accountScore: Math.floor(Math.random() * 100),
          results: [
            {
              FraudCheckResult: {
                accountScore: Math.floor(Math.random() * 100),
                checkId: 1,
                name: 'CVV Check'
              }
            }
          ]
        }
      };
    } else {
      // Failed payment response
      const failureReasons = [
        { 
          resultCode: 'Refused' as const, 
          refusalReason: 'Refused', 
          refusalReasonCode: '2',
          additionalData: { 'refusalReasonRaw': 'DECLINED' }
        },
        { 
          resultCode: 'Refused' as const, 
          refusalReason: 'CVC Declined', 
          refusalReasonCode: '7',
          additionalData: { 'refusalReasonRaw': 'CVC_DECLINED' }
        },
        { 
          resultCode: 'Refused' as const, 
          refusalReason: 'Expired Card', 
          refusalReasonCode: '6',
          additionalData: { 'refusalReasonRaw': 'EXPIRED_CARD' }
        },
        { 
          resultCode: 'Refused' as const, 
          refusalReason: 'Insufficient Funds', 
          refusalReasonCode: '5',
          additionalData: { 'refusalReasonRaw': 'INSUFFICIENT_FUNDS' }
        },
        { 
          resultCode: 'Error' as const, 
          refusalReason: 'Acquirer Error', 
          refusalReasonCode: '10',
          additionalData: { 'refusalReasonRaw': 'ACQUIRER_ERROR' }
        }
      ];

      const failure = failureReasons[Math.floor(Math.random() * failureReasons.length)];

      return {
        pspReference,
        resultCode: failure.resultCode,
        merchantReference: payload.referenceId,
        paymentMethod: {
          type: 'scheme',
          brand: this.getRandomCardBrand(),
          lastFour: this.generateRandomDigits(4),
          expiryMonth: failure.refusalReasonCode === '6' ? '11' : '12',
          expiryYear: failure.refusalReasonCode === '6' ? '2020' : '2025'
        },
        amount: {
          value: payload.amount,
          currency: payload.currency
        },
        refusalReason: failure.refusalReason,
        refusalReasonCode: failure.refusalReasonCode,
        additionalData: {
          ...failure.additionalData,
          'paymentMethod.variant': this.getRandomCardBrand().toLowerCase(),
          'avsResult': failure.refusalReasonCode === '7' ? '2 Neither postal code nor address match' : '0 Unknown',
          'cvcResult': failure.refusalReasonCode === '7' ? '2 No match' : '1 Match',
          'fraudScore': Math.floor(Math.random() * 50 + 50).toString(), // Higher fraud scores for failures
          'acquirerCode': '1234',
          'issuerCountry': this.getRandomCountryCode()
        }
      };
    }
  }

  /**
   * Generate HMAC signature for Adyen request
   */
  generateHmacSignature(payload: any): string {
    // Adyen HMAC signature calculation
    // In reality, this would use the actual request body and specific key format
    const dataToSign = JSON.stringify(payload) + this.merchantAccount + Date.now();
    const hmac = createHmac('sha256', Buffer.from(this.hmacKey, 'hex'));
    hmac.update(dataToSign, 'utf8');
    return hmac.digest('base64');
  }

  /**
   * Get required Adyen headers for request
   */
  getRequiredHeaders(hmacSignature: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      'Adyen-Library-Name': 'adyen-node-api-library',
      'Adyen-Library-Version': '13.0.0',
      'User-Agent': 'adyen-node-api-library/13.0.0',
      'X-Adyen-Hmac-Signature': hmacSignature,
      'Accept': 'application/json'
    };
  }

  /**
   * Generate mock Adyen request body
   */
  generateRequestBody(payload: PaymentRequest): any {
    return {
      amount: {
        value: payload.amount,
        currency: payload.currency
      },
      merchantAccount: this.merchantAccount,
      paymentMethod: {
        type: 'scheme',
        encryptedCardNumber: this.generateEncryptedData('card_number'),
        encryptedExpiryMonth: this.generateEncryptedData('exp_month'),
        encryptedExpiryYear: this.generateEncryptedData('exp_year'),
        encryptedSecurityCode: this.generateEncryptedData('cvc'),
        holderName: payload.customerDetails ? 
          `${payload.customerDetails.firstName} ${payload.customerDetails.lastName}` : 
          'John Doe'
      },
      reference: payload.referenceId || this.generateMerchantReference(),
      shopperReference: payload.customerDetails?.email?.replace('@', '_at_').replace('.', '_dot_') || 'guest_shopper',
      shopperEmail: payload.customerDetails?.email,
      shopperIP: '192.168.1.100', // Mock IP
      shopperInteraction: 'Ecommerce',
      returnUrl: 'https://your-company.com/checkout/return',
      countryCode: 'US',
      shopperLocale: 'en_US',
      channel: 'Web',
      origin: 'https://your-company.com',
      additionalData: {
        'card.encrypted.json': this.generateEncryptedCardData(),
        'allow3DS2': 'true',
        'executeThreeD': 'false'
      },
      browserInfo: {
        acceptHeader: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        colorDepth: 24,
        language: 'en-US',
        javaEnabled: false,
        screenHeight: 1080,
        screenWidth: 1920,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        timeZoneOffset: -480
      },
      lineItems: [
        {
          id: '1',
          description: payload.description || 'Payment',
          amountIncludingTax: payload.amount,
          quantity: 1
        }
      ]
    };
  }

  /**
   * Generate encrypted card data (mock)
   */
  private generateEncryptedData(type: string): string {
    const prefix = `adyenjs_0_1_25$`;
    const randomData = randomBytes(32).toString('base64');
    return `${prefix}${randomData}${type}$mock`;
  }

  /**
   * Generate encrypted card data blob
   */
  private generateEncryptedCardData(): string {
    return `adyenjs_0_1_25$${randomBytes(64).toString('base64')}$encrypted_card_data`;
  }

  /**
   * Generate Adyen PSP reference
   */
  private generatePspReference(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    return `${timestamp}${random}`;
  }

  /**
   * Generate authorization code
   */
  private generateAuthCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate acquirer reference
   */
  private generateAcquirerReference(): string {
    return `ACQ${Date.now()}${Math.floor(Math.random() * 9999)}`;
  }

  /**
   * Generate merchant reference
   */
  private generateMerchantReference(): string {
    return `ORDER_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  }

  /**
   * Generate random card brand
   */
  private getRandomCardBrand(): 'VISA' | 'MC' | 'AMEX' | 'DISCOVER' {
    const brands: Array<'VISA' | 'MC' | 'AMEX' | 'DISCOVER'> = ['VISA', 'MC', 'AMEX', 'DISCOVER'];
    return brands[Math.floor(Math.random() * brands.length)];
  }

  /**
   * Generate random AVS result
   */
  private getRandomAvsResult(): string {
    const results = [
      '0 Unknown',
      '1 Address matches, postal code doesn\'t',
      '2 Neither postal code nor address match',
      '3 AVS unavailable',
      '4 AVS not supported for this card type',
      '5 No AVS data provided',
      '6 Postal code matches, address doesn\'t match',
      '7 Both postal code and address match'
    ];
    return results[Math.floor(Math.random() * results.length)];
  }

  /**
   * Generate random CVC result
   */
  private getRandomCvcResult(): string {
    const results = ['0 Unknown', '1 Match', '2 No match', '3 Not checked', '4 No CVC/CVV provided'];
    return results[Math.floor(Math.random() * results.length)];
  }

  /**
   * Generate random country code
   */
  private getRandomCountryCode(): string {
    const countries = ['US', 'GB', 'DE', 'FR', 'NL', 'CA', 'AU', 'IT', 'ES', 'JP'];
    return countries[Math.floor(Math.random() * countries.length)];
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
   * Get merchant account for external access
   */
  getMerchantAccount(): string {
    return this.merchantAccount;
  }

  /**
   * Get API key for external access
   */
  getApiKey(): string {
    return this.apiKey;
  }
} 