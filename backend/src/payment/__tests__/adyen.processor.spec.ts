import { Test, TestingModule } from '@nestjs/testing';
import { AdyenProcessor } from '../processors/adyen.processor';
import { AdyenMockService } from '../mocks/adyen-mock.service';
import { PaymentRequest, PaymentStatus, Currency, BankId } from '../../../../shared';

describe('AdyenProcessor', () => {
  let processor: AdyenProcessor;
  let mockService: AdyenMockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdyenProcessor, AdyenMockService],
    }).compile();

    processor = module.get<AdyenProcessor>(AdyenProcessor);
    mockService = module.get<AdyenMockService>(AdyenMockService);
    
    // Mock logger to suppress error messages during tests
    jest.spyOn(processor['logger'], 'error').mockImplementation(() => {});
  });

  describe('Processor Configuration', () => {
    it('should be defined and properly configured', () => {
      expect(processor).toBeDefined();
      expect(processor.getDisplayName()).toBe('Adyen Global Payments');
      expect(processor.bankId).toBe(BankId.ADYEN);
      expect(processor.config.enabled).toBe(true);
      expect(processor.config.apiUrl).toBe('https://checkout-test.adyen.com/v71/payments');
    });

    it('should return comprehensive processor info with security features', () => {
      const info = processor.getProcessorInfo();
      
      expect(info.name).toBe('Adyen');
      expect(info.type).toBe('card_payment');
      expect(info.features).toContain('hmac_authentication');
      expect(info.features).toContain('encrypted_card_data');
      expect(info.features).toContain('fraud_scoring');
      expect(info.features).toContain('global_processing');
      expect(info.features).toContain('3ds2_support');
      expect(info.security_features).toContain('PCI_DSS_Level_1');
      expect(info.security_features).toContain('HMAC_SHA256_Authentication');
      expect(info.supported_currencies).toContain('USD');
      expect(info.supported_currencies).toContain('EUR');
      expect(info.supported_currencies).toContain('UAH'); // Ukraine support
      expect(info.average_processing_time_ms).toBe(300);
    });
  });

  describe('Payment Processing', () => {
    const validPaymentRequest: PaymentRequest = {
      amount: 2500, // $25.00
      currency: Currency.USD,
      bankId: BankId.ADYEN,
      description: 'Test Adyen payment',
      referenceId: 'adyen-test-ref-456',
      customerDetails: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com'
      }
    };

    it('should process successful payment with complete Adyen response', async () => {
      // Mock successful response
      jest.spyOn(mockService, 'generatePaymentResponse').mockReturnValue({
        pspReference: '1735257600123456789',
        resultCode: 'Authorised',
        authCode: 'ABC123',
        merchantReference: 'adyen-test-ref-456',
        paymentMethod: {
          type: 'scheme',
          brand: 'VISA',
          lastFour: '4242',
          expiryMonth: '12',
          expiryYear: '2025',
          holderName: 'Jane Smith'
        },
        amount: {
          value: 2500,
          currency: 'USD'
        },
        additionalData: {
          'paymentMethod.variant': 'visa',
          'authCode': 'ABC123',
          'avsResult': '7 Both postal code and address match',
          'cvcResult': '1 Match',
          'fraudScore': '15',
          'networkToken.available': 'false',
          'acquirerAccountCode': 'TestAcquirer',
          'acquirerCode': '1234',
          'acquirerReference': 'ACQ1735257600123',
          'cardSummary': '•••• 4242',
          'expiryDate': '12/2025',
          'issuerCountry': 'US',
          'shopperInteraction': 'Ecommerce'
        },
        fraudResult: {
          accountScore: 15,
          results: [
            {
              FraudCheckResult: {
                accountScore: 15,
                checkId: 1,
                name: 'CVV Check'
              }
            }
          ]
        }
      });

      const result = await processor.charge(validPaymentRequest);

      expect(result.transactionId).toBe('1735257600123456789');
      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(result.amount).toBe(2500);
      expect(result.currency).toBe(Currency.USD);
      expect(result.bankId).toBe(BankId.ADYEN);
      expect(result.referenceId).toBe('adyen-test-ref-456');
      expect(result.errorMessage).toBeUndefined();
      
      // Check Adyen-specific data
      expect(result.bankSpecificData).toBeDefined();
      expect(result.bankSpecificData?.originalTransactionId).toBe('1735257600123456789');
      expect(result.bankSpecificData?.authorizationCode).toBe('ABC123');
      expect(result.bankSpecificData?.merchantReference).toBe('adyen-test-ref-456');
      expect(result.bankSpecificData?.cardBrand).toBe('VISA');
      expect(result.bankSpecificData?.cardLast4).toBe('4242');
      expect(result.bankSpecificData?.cardHolderName).toBe('Jane Smith');
      expect(result.bankSpecificData?.fraudScore).toBe('15');
      expect(result.bankSpecificData?.avsResult).toBe('7 Both postal code and address match');
      expect(result.bankSpecificData?.cvcResult).toBe('1 Match');
      expect(result.bankSpecificData?.issuerCountry).toBe('US');
      expect(result.bankSpecificData?.fraudResultScore).toBe(15);
    }, 10000);

    it('should handle failed payment with Adyen error details', async () => {
      // Mock failed response
      jest.spyOn(mockService, 'generatePaymentResponse').mockReturnValue({
        pspReference: '1735257600987654321',
        resultCode: 'Refused',
        merchantReference: 'adyen-test-ref-456',
        paymentMethod: {
          type: 'scheme',
          brand: 'VISA',
          lastFour: '0002',
          expiryMonth: '12',
          expiryYear: '2025'
        },
        amount: {
          value: 2500,
          currency: 'USD'
        },
        refusalReason: 'CVC Declined',
        refusalReasonCode: '7',
        additionalData: {
          'refusalReasonRaw': 'CVC_DECLINED',
          'paymentMethod.variant': 'visa',
          'avsResult': '2 Neither postal code nor address match',
          'cvcResult': '2 No match',
          'fraudScore': '75',
          'acquirerCode': '1234',
          'issuerCountry': 'US'
        }
      });

      const result = await processor.charge(validPaymentRequest);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.transactionId).toBe('1735257600987654321');
      expect(result.errorMessage).toBe('CVC Declined');
      expect(result.errorCode).toBe('7');
      
      // Check error-specific data
      expect(result.bankSpecificData?.resultCode).toBe('Refused');
      expect(result.bankSpecificData?.refusalReason).toBe('CVC Declined');
      expect(result.bankSpecificData?.refusalReasonCode).toBe('7');
      expect(result.bankSpecificData?.refusalReasonRaw).toBe('CVC_DECLINED');
      expect(result.bankSpecificData?.cvcResult).toBe('2 No match');
      expect(result.bankSpecificData?.fraudScore).toBe('75');
    }, 10000);

    it('should handle processing errors gracefully', async () => {
      // Mock service to simulate error
      jest.spyOn(mockService, 'generatePaymentResponse').mockImplementation(() => {
        throw new Error('HMAC signature validation failed');
      });

      const result = await processor.charge(validPaymentRequest);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorMessage).toBe('Adyen processing error: HMAC signature validation failed');
      expect(result.errorCode).toBe('ADYEN_API_ERROR');
      expect(result.bankId).toBe(BankId.ADYEN);
    });

    it('should verify realistic processing time for Adyen', async () => {
      const startTime = Date.now();
      await processor.charge(validPaymentRequest);
      const endTime = Date.now();
      
      // Adyen should process within reasonable time (fast but thorough)
      expect(endTime - startTime).toBeGreaterThan(250); // At least 250ms
      expect(endTime - startTime).toBeLessThan(500); // Less than 500ms
    });
  });

  describe('HMAC Authentication & Security', () => {
    const securityTestPayment: PaymentRequest = {
      amount: 1000,
      currency: Currency.EUR,
      bankId: BankId.ADYEN,
      description: 'HMAC security test',
      referenceId: 'hmac-test-789'
    };

    it('should generate proper HMAC signatures', () => {
      const spy = jest.spyOn(mockService, 'generateHmacSignature');
      
      processor.charge(securityTestPayment);
      
      expect(spy).toHaveBeenCalled();
      const signature = spy.mock.results[0].value;
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(20); // HMAC signatures are substantial
    });

    it('should include all required Adyen security headers', () => {
      const spy = jest.spyOn(mockService, 'getRequiredHeaders');
      
      processor.charge(securityTestPayment);
      
      expect(spy).toHaveBeenCalled();
      const headers = spy.mock.results[0].value;
      
      expect(headers['X-API-Key']).toBe('AQE1hmfuXNWTK0Qc+iSS3VlbmY1mFGfXV2RKzeVL-mock-api-key');
      expect(headers['X-Adyen-Hmac-Signature']).toBeDefined();
      expect(headers['Adyen-Library-Name']).toBe('adyen-node-api-library');
      expect(headers['Adyen-Library-Version']).toBe('13.0.0');
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Accept']).toBe('application/json');
    });

    it('should generate proper encrypted card data in request body', () => {
      const spy = jest.spyOn(mockService, 'generateRequestBody');
      
      processor.charge(securityTestPayment);
      
      expect(spy).toHaveBeenCalled();
      const requestBody = spy.mock.results[0].value;
      
      // Check encrypted card data
      expect(requestBody.paymentMethod.type).toBe('scheme');
      expect(requestBody.paymentMethod.encryptedCardNumber).toMatch(/^adyenjs_0_1_25\$/);
      expect(requestBody.paymentMethod.encryptedExpiryMonth).toMatch(/^adyenjs_0_1_25\$/);
      expect(requestBody.paymentMethod.encryptedExpiryYear).toMatch(/^adyenjs_0_1_25\$/);
      expect(requestBody.paymentMethod.encryptedSecurityCode).toMatch(/^adyenjs_0_1_25\$/);
      
      // Check additional security data
      expect(requestBody.additionalData['card.encrypted.json']).toMatch(/^adyenjs_0_1_25\$/);
      expect(requestBody.additionalData['allow3DS2']).toBe('true');
      expect(requestBody.shopperInteraction).toBe('Ecommerce');
    });

    it('should include comprehensive browser fingerprinting data', () => {
      const spy = jest.spyOn(mockService, 'generateRequestBody');
      
      processor.charge(securityTestPayment);
      
      const requestBody = spy.mock.results[0].value;
      
      expect(requestBody.browserInfo).toBeDefined();
      expect(requestBody.browserInfo.acceptHeader).toBeDefined();
      expect(requestBody.browserInfo.colorDepth).toBe(24);
      expect(requestBody.browserInfo.language).toBe('en-US');
      expect(requestBody.browserInfo.javaEnabled).toBe(false);
      expect(requestBody.browserInfo.screenHeight).toBe(1080);
      expect(requestBody.browserInfo.screenWidth).toBe(1920);
      expect(requestBody.browserInfo.userAgent).toContain('Mozilla');
      expect(requestBody.browserInfo.timeZoneOffset).toBe(-480);
    });
  });

  describe('Status Mapping', () => {
    it('should correctly map all Adyen result codes to unified statuses', async () => {
      const testCases = [
        { adyenResultCode: 'Authorised', expectedStatus: PaymentStatus.SUCCESS },
        { adyenResultCode: 'Pending', expectedStatus: PaymentStatus.PENDING },
        { adyenResultCode: 'Received', expectedStatus: PaymentStatus.PENDING },
        { adyenResultCode: 'Cancelled', expectedStatus: PaymentStatus.CANCELLED },
        { adyenResultCode: 'Refused', expectedStatus: PaymentStatus.FAILED },
        { adyenResultCode: 'Error', expectedStatus: PaymentStatus.FAILED }
      ];

      for (const { adyenResultCode, expectedStatus } of testCases) {
        jest.spyOn(mockService, 'generatePaymentResponse').mockReturnValue({
          pspReference: 'test_psp_ref',
          resultCode: adyenResultCode as any,
          merchantReference: 'test_ref',
          amount: { value: 1000, currency: 'USD' }
        });

        const result = await processor.charge({
          amount: 1000,
          currency: Currency.USD,
          bankId: BankId.ADYEN,
          description: 'Status mapping test'
        });

        expect(result.status).toBe(expectedStatus);
      }
    });
  });

  describe('canProcess Method', () => {
    it('should accept payments for Adyen bank ID when enabled', () => {
      const adyenPayment: PaymentRequest = {
        amount: 1000,
        currency: Currency.USD,
        bankId: BankId.ADYEN,
        description: 'Adyen test'
      };

      expect(processor.canProcess(adyenPayment)).toBe(true);
    });

    it('should reject payments for other bank IDs', () => {
      const stripePayment: PaymentRequest = {
        amount: 1000,
        currency: Currency.USD,
        bankId: BankId.STRIPE,
        description: 'Stripe test'
      };

      expect(processor.canProcess(stripePayment)).toBe(false);
    });
  });
}); 