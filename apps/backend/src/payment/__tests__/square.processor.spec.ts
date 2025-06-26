import { Test, TestingModule } from '@nestjs/testing';
import { SquareProcessor } from '../processors/square.processor';
import { SquareMockService } from '../mocks/square-mock.service';
import { PaymentRequest, PaymentStatus, Currency, BankId } from '@nestjs-payment-gateway/shared';

describe('SquareProcessor', () => {
  let processor: SquareProcessor;
  let mockService: SquareMockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SquareProcessor, SquareMockService],
    }).compile();

    processor = module.get<SquareProcessor>(SquareProcessor);
    mockService = module.get<SquareMockService>(SquareMockService);
    
    // Mock logger to suppress error messages during tests
    jest.spyOn(processor['logger'], 'error').mockImplementation(() => {});
  });

  describe('Processor Configuration', () => {
    it('should be defined and properly configured', () => {
      expect(processor).toBeDefined();
      expect(processor.getDisplayName()).toBe('Square Payments');
      expect(processor.bankId).toBe(BankId.SQUARE);
      expect(processor.config.enabled).toBe(true);
      expect(processor.config.apiUrl).toBe('https://connect.squareupsandbox.com');
    });

    it('should return comprehensive processor info', () => {
      const info = processor.getProcessorInfo();
      
      expect(info.name).toBe('Square');
      expect(info.type).toBe('card_payment');
      expect(info.features).toContain('idempotency_protection');
      expect(info.features).toContain('custom_headers');
      expect(info.features).toContain('location_based_processing');
      expect(info.features).toContain('risk_evaluation');
      expect(info.supported_currencies).toContain('USD');
      expect(info.average_processing_time_ms).toBe(800);
    });
  });

  describe('Payment Processing', () => {
    const validPaymentRequest: PaymentRequest = {
      amount: 2000, // $20.00
      currency: Currency.USD,
      bankId: BankId.SQUARE,
      description: 'Test Square payment',
      referenceId: 'test-ref-123',
      customerDetails: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      }
    };

    it('should process successful payment with complete Square response', async () => {
      // Mock successful response
      jest.spyOn(mockService, 'generatePaymentResponse').mockReturnValue({
        payment: {
          id: 'sqpmt_123456789',
          created_at: '2023-10-18T14:30:00Z',
          updated_at: '2023-10-18T14:30:01Z',
          amount_money: {
            amount: 2000,
            currency: 'USD'
          },
          status: 'COMPLETED',
          source_type: 'CARD',
          card_details: {
            status: 'CAPTURED',
            card: {
              card_brand: 'VISA',
              last_4: '1234',
              exp_month: 12,
              exp_year: 2025,
              fingerprint: 'sq0fingerprint123'
            },
            entry_method: 'KEYED',
            cvv_status: 'CVV_ACCEPTED',
            avs_status: 'AVS_ACCEPTED',
            auth_result_code: 'tZvGUN'
          },
          location_id: 'LH2B1Q6V7GNPG',
          processing_fee: [{
            effective_at: '2023-10-18T14:30:00Z',
            type: 'INITIAL',
            amount_money: {
              amount: 88, // 2.9% + $0.30
              currency: 'USD'
            }
          }],
          reference_id: 'test-ref-123',
          note: 'Test Square payment',
          receipt_number: 'SQ17023003001234',
          receipt_url: 'https://squareup.com/receipt/preview/sqpmt_123456789',
          risk_evaluation: {
            created_at: '2023-10-18T14:30:00Z',
            risk_level: 'NORMAL'
          },
          version_token: 'versionToken123'
        }
      });

      const result = await processor.charge(validPaymentRequest);

      expect(result.transactionId).toBe('sqpmt_123456789');
      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(result.amount).toBe(2000);
      expect(result.currency).toBe(Currency.USD);
      expect(result.bankId).toBe(BankId.SQUARE);
      expect(result.referenceId).toBe('test-ref-123');
      expect(result.errorMessage).toBeUndefined();
      
      // Check Square-specific data
      expect(result.bankSpecificData).toBeDefined();
      expect(result.bankSpecificData?.originalTransactionId).toBe('sqpmt_123456789');
      expect(result.bankSpecificData?.authorizationCode).toBe('tZvGUN');
      expect(result.bankSpecificData?.receiptNumber).toBe('SQ17023003001234');
      expect(result.bankSpecificData?.locationId).toBe('LH2B1Q6V7GNPG');
      expect(result.bankSpecificData?.cardBrand).toBe('VISA');
      expect(result.bankSpecificData?.cardLast4).toBe('1234');
      expect(result.bankSpecificData?.riskLevel).toBe('NORMAL');
      expect(result.bankSpecificData?.processingFee).toBe(88);
    }, 10000);

    it('should handle failed payment with Square error details', async () => {
      // Mock failed response
      jest.spyOn(mockService, 'generatePaymentResponse').mockReturnValue({
        payment: {
          id: 'sqpmt_failed_123',
          created_at: '2023-10-18T14:30:00Z',
          updated_at: '2023-10-18T14:30:01Z',
          amount_money: {
            amount: 2000,
            currency: 'USD'
          },
          status: 'FAILED',
          source_type: 'CARD',
          card_details: {
            status: 'FAILED',
            card: {
              card_brand: 'VISA',
              last_4: '9995',
              exp_month: 12,
              exp_year: 2025,
              fingerprint: 'sq0fingerprint123'
            },
            entry_method: 'KEYED',
            cvv_status: 'CVV_REJECTED',
            avs_status: 'AVS_ACCEPTED',
            auth_result_code: 'XXXXXX'
          },
          location_id: 'LH2B1Q6V7GNPG',
          reference_id: 'test-ref-123',
          note: 'Test Square payment',
          receipt_number: 'SQ17023003001235',
          receipt_url: 'https://squareup.com/receipt/preview/sqpmt_failed_123',
          version_token: 'versionToken456'
        },
        errors: [{
          category: 'PAYMENT_METHOD_ERROR',
          code: 'CVV_FAILURE',
          detail: 'The provided CVV does not match the card.'
        }]
      });

      const result = await processor.charge(validPaymentRequest);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.transactionId).toBe('sqpmt_failed_123');
      expect(result.errorMessage).toBe('The provided CVV does not match the card.');
      expect(result.errorCode).toBe('CVV_FAILURE');
      
      // Check error-specific data
      expect(result.bankSpecificData?.errorCategory).toBe('PAYMENT_METHOD_ERROR');
      expect(result.bankSpecificData?.cvvStatus).toBe('CVV_REJECTED');
      expect(result.bankSpecificData?.cardLast4).toBe('9995');
    }, 10000);

    it('should handle processing timeouts gracefully', async () => {
      // Mock service to simulate timeout
      jest.spyOn(mockService, 'generatePaymentResponse').mockImplementation(() => {
        throw new Error('Request timeout');
      });

      const result = await processor.charge(validPaymentRequest);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorMessage).toBe('Square processing error: Request timeout');
      expect(result.errorCode).toBe('SQUARE_API_ERROR');
      expect(result.bankId).toBe(BankId.SQUARE);
    });

         it('should verify realistic processing time', async () => {
       const startTime = Date.now();
       await processor.charge(validPaymentRequest);
       const endTime = Date.now();
       
       // Square should process within reasonable time (allowing for some variance)
       expect(endTime - startTime).toBeGreaterThan(500); // At least 500ms
       expect(endTime - startTime).toBeLessThan(1200); // Less than 1200ms
     });
  });

  describe('Square-Specific Features', () => {
    const testPayment: PaymentRequest = {
      amount: 1500,
      currency: Currency.USD,
      bankId: BankId.SQUARE,
      description: 'Square features test',
      referenceId: 'feature-test-456'
    };

    it('should generate proper idempotency keys', () => {
      // Test the private method through public interface
      const spy = jest.spyOn(mockService, 'getRequiredHeaders');
      
      processor.charge(testPayment);
      
      expect(spy).toHaveBeenCalled();
      const headers = spy.mock.results[0].value;
      expect(headers['Idempotency-Key']).toBeDefined();
      expect(headers['Idempotency-Key']).toMatch(/^feature-test-456-\d+$/);
    });

    it('should include all required Square headers', () => {
      const spy = jest.spyOn(mockService, 'getRequiredHeaders');
      
      processor.charge(testPayment);
      
      expect(spy).toHaveBeenCalled();
      const headers = spy.mock.results[0].value;
      
      expect(headers['Authorization']).toBe('Bearer sandbox-sq0idp-mock_access_token');
      expect(headers['Square-Version']).toBe('2023-10-18');
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['User-Agent']).toBe('Square-TypeScript-SDK/1.0.0');
      expect(headers['Idempotency-Key']).toBeDefined();
    });

    it('should generate proper Square request body', () => {
      const spy = jest.spyOn(mockService, 'generateRequestBody');
      
      processor.charge(testPayment);
      
      expect(spy).toHaveBeenCalled();
      const requestBody = spy.mock.results[0].value;
      
      expect(requestBody.source_id).toBe('cnon:card-nonce-ok');
      expect(requestBody.amount_money.amount).toBe(1500);
      expect(requestBody.amount_money.currency).toBe('USD');
      expect(requestBody.location_id).toBe('LH2B1Q6V7GNPG');
      expect(requestBody.reference_id).toBe('feature-test-456');
      expect(requestBody.autocomplete).toBe(true);
    });

    it('should handle large transactions with app fees', async () => {
      const largePayment: PaymentRequest = {
        amount: 15000, // $150.00 - triggers app fee
        currency: Currency.USD,
        bankId: BankId.SQUARE,
        description: 'Large transaction test'
      };

      const spy = jest.spyOn(mockService, 'generateRequestBody');
      
      await processor.charge(largePayment);
      
      const requestBody = spy.mock.results[0].value;
      expect(requestBody.app_fee_money).toBeDefined();
      expect(requestBody.app_fee_money.amount).toBe(150); // 1% of 15000
    });
  });

  describe('Status Mapping', () => {
    it('should correctly map all Square statuses to unified statuses', async () => {
      const testCases = [
        { squareStatus: 'COMPLETED', expectedStatus: PaymentStatus.SUCCESS },
        { squareStatus: 'APPROVED', expectedStatus: PaymentStatus.PENDING },
        { squareStatus: 'PENDING', expectedStatus: PaymentStatus.PENDING },
        { squareStatus: 'CANCELED', expectedStatus: PaymentStatus.CANCELLED },
        { squareStatus: 'FAILED', expectedStatus: PaymentStatus.FAILED },
        { squareStatus: undefined, expectedStatus: PaymentStatus.FAILED }
      ];

      for (const { squareStatus, expectedStatus } of testCases) {
        jest.spyOn(mockService, 'generatePaymentResponse').mockReturnValue({
          payment: {
            id: 'test_id',
            created_at: '2023-10-18T14:30:00Z',
            updated_at: '2023-10-18T14:30:00Z',
            amount_money: { amount: 1000, currency: 'USD' },
            status: squareStatus as any,
            source_type: 'CARD',
            location_id: 'test_location',
            receipt_number: 'test_receipt',
            receipt_url: 'https://test.com',
            version_token: 'test_token'
          }
        });

        const result = await processor.charge({
          amount: 1000,
          currency: Currency.USD,
          bankId: BankId.SQUARE,
          description: 'Status test'
        });

        expect(result.status).toBe(expectedStatus);
      }
    });
  });

  describe('Error Handling', () => {
    const errorPayment: PaymentRequest = {
      amount: 500,
      currency: Currency.USD,
      bankId: BankId.SQUARE,
      description: 'Error test'
    };

         it('should handle various Square error categories', async () => {
       const errorTypes = [
         { category: 'PAYMENT_METHOD_ERROR' as const, code: 'CARD_DECLINED' as const, detail: 'Card was declined by the issuer.' },
         { category: 'PAYMENT_METHOD_ERROR' as const, code: 'EXPIRED_CARD' as const, detail: 'The provided card is expired.' },
         { category: 'PAYMENT_METHOD_ERROR' as const, code: 'INSUFFICIENT_FUNDS' as const, detail: 'The card does not have sufficient funds.' }
       ];

      for (const error of errorTypes) {
        jest.spyOn(mockService, 'generatePaymentResponse').mockReturnValue({
          payment: {
            id: 'error_test',
            created_at: '2023-10-18T14:30:00Z',
            updated_at: '2023-10-18T14:30:00Z',
            amount_money: { amount: 500, currency: 'USD' },
            status: 'FAILED',
            source_type: 'CARD',
            location_id: 'test_location',
            receipt_number: 'error_receipt',
            receipt_url: 'https://test.com',
            version_token: 'error_token'
          },
          errors: [error]
        });

        const result = await processor.charge(errorPayment);

        expect(result.status).toBe(PaymentStatus.FAILED);
        expect(result.errorMessage).toBe(error.detail);
        expect(result.errorCode).toBe(error.code);
        expect(result.bankSpecificData?.errorCategory).toBe(error.category);
      }
    });

    it('should handle missing payment data gracefully', async () => {
      jest.spyOn(mockService, 'generatePaymentResponse').mockReturnValue({
        errors: [{
          category: 'PAYMENT_METHOD_ERROR',
          code: 'CARD_DECLINED',
          detail: 'Generic card decline error'
        }]
      });

      const result = await processor.charge(errorPayment);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.transactionId).toMatch(/^TXN_\d+_[a-f0-9]{8}$/); // Generated ID pattern
      expect(result.errorMessage).toBe('Generic card decline error');
    });
  });

  describe('canProcess Method', () => {
    it('should accept payments for Square bank ID when enabled', () => {
      const squarePayment: PaymentRequest = {
        amount: 1000,
        currency: Currency.USD,
        bankId: BankId.SQUARE,
        description: 'Square test'
      };

      expect(processor.canProcess(squarePayment)).toBe(true);
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