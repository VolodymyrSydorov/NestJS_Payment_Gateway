import { Test, TestingModule } from '@nestjs/testing';
import { BraintreeProcessor } from '../processors/braintree.processor';
import { BraintreeMockService } from '../mocks/braintree-mock.service';
import { PaymentRequest, PaymentStatus, Currency, BankId } from '@nestjs-payment-gateway/shared';

describe('BraintreeProcessor', () => {
  let processor: BraintreeProcessor;
  let mockService: BraintreeMockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BraintreeProcessor, BraintreeMockService],
    }).compile();

    processor = module.get<BraintreeProcessor>(BraintreeProcessor);
    mockService = module.get<BraintreeMockService>(BraintreeMockService);
    
    // Mock logger to suppress error messages during tests
    jest.spyOn(processor['logger'], 'error').mockImplementation(() => {});
  });

  describe('Processor Configuration', () => {
    it('should be defined and properly configured', () => {
      expect(processor).toBeDefined();
      expect(processor.getDisplayName()).toBe('Braintree Payments (PayPal)');
      expect(processor.bankId).toBe(BankId.BRAINTREE);
      expect(processor.config.enabled).toBe(true);
      expect(processor.config.apiUrl).toBe('https://payments.sandbox.braintree-api.com/graphql');
    });

    it('should return comprehensive processor info with GraphQL features', () => {
      const info = processor.getProcessorInfo();
      
      expect(info.name).toBe('Braintree');
      expect(info.type).toBe('card_payment');
      expect(info.api_type).toBe('GraphQL');
      expect(info.features).toContain('graphql_mutations');
      expect(info.features).toContain('advanced_fraud_detection');
      expect(info.features).toContain('paypal_integration');
      expect(info.average_processing_time_ms).toBe(400);
    });
  });

  describe('Payment Processing', () => {
    const validPaymentRequest: PaymentRequest = {
      amount: 1500, // $15.00
      currency: Currency.USD,
      bankId: BankId.BRAINTREE,
      description: 'Test Braintree GraphQL payment',
      referenceId: 'braintree-test-ref-123',
      customerDetails: {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@example.com'
      }
    };

    it('should process successful payment with complete Braintree GraphQL response', async () => {
      // Mock successful GraphQL response
      jest.spyOn(mockService, 'generatePaymentResponse').mockReturnValue({
        data: {
          chargePaymentMethod: {
            transaction: {
              id: 'VHJhbnNhY3Rpb246YnRfMTczNTI1NzYwMF9hYmNkZWY=',
              legacyId: 'bt_1735257600_abcdef123456',
              orderId: 'braintree-test-ref-123',
              createdAt: '2023-10-18T14:30:00Z',
              amount: {
                value: '15.00',
                currencyCode: 'USD'
              },
              status: 'SUBMITTED_FOR_SETTLEMENT',
              paymentMethod: {
                id: 'pm_1735257600_abc123',
                details: {
                  brand: 'Visa',
                  last4: '1234',
                  expirationMonth: '12',
                  expirationYear: '2025',
                  cardholderName: 'Alice Johnson'
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
                transactionRiskScore: '25'
              }
            }
          }
        }
      });

      const result = await processor.charge(validPaymentRequest);

      expect(result.transactionId).toBe('bt_1735257600_abcdef123456');
      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(result.amount).toBe(1500);
      expect(result.currency).toBe(Currency.USD);
      expect(result.bankId).toBe(BankId.BRAINTREE);
      expect(result.referenceId).toBe('braintree-test-ref-123');
      expect(result.errorMessage).toBeUndefined();
      
      // Check Braintree-specific data
      expect(result.bankSpecificData).toBeDefined();
      expect(result.bankSpecificData?.originalTransactionId).toBe('bt_1735257600_abcdef123456');
      expect(result.bankSpecificData?.graphqlId).toBe('VHJhbnNhY3Rpb246YnRfMTczNTI1NzYwMF9hYmNkZWY=');
      expect(result.bankSpecificData?.authorizationCode).toBe('1000');
      expect(result.bankSpecificData?.cardBrand).toBe('Visa');
      expect(result.bankSpecificData?.cardLast4).toBe('1234');
      expect(result.bankSpecificData?.riskDecision).toBe('APPROVE');
    }, 10000);

    it('should handle failed payment with Braintree error details', async () => {
      // Mock failed GraphQL response
      jest.spyOn(mockService, 'generatePaymentResponse').mockReturnValue({
        data: {
          chargePaymentMethod: {
            transaction: {
              id: 'VHJhbnNhY3Rpb246YnRfZmFpbGVkXzEyMw==',
              legacyId: 'bt_failed_123456789',
              orderId: 'braintree-test-ref-123',
              createdAt: '2023-10-18T14:30:00Z',
              amount: {
                value: '15.00',
                currencyCode: 'USD'
              },
              status: 'PROCESSOR_DECLINED',
              paymentMethod: {
                id: 'pm_failed_abc123',
                details: {
                  brand: 'Visa',
                  last4: '0002',
                  expirationMonth: '12',
                  expirationYear: '2025',
                  cardholderName: 'Test User'
                }
              },
              processorResponse: {
                legacyCode: '2000',
                message: 'Do Not Honor',
                cvvResponse: 'M'
              },
              riskData: {
                decision: 'DECLINE',
                transactionRiskScore: '75'
              },
              processorResponseCode: '2000',
              processorResponseText: 'Do Not Honor'
            }
          }
        }
      });

      const result = await processor.charge(validPaymentRequest);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.transactionId).toBe('bt_failed_123456789');
      expect(result.errorMessage).toBe('Do Not Honor');
      expect(result.errorCode).toBe('2000');
    }, 10000);

    it('should handle GraphQL errors gracefully', async () => {
      // Mock GraphQL errors
      jest.spyOn(mockService, 'generatePaymentResponse').mockReturnValue({
        errors: [{
          message: 'Payment method nonce is invalid',
          extensions: {
            code: 'INVALID_PAYMENT_METHOD'
          }
        }]
      });

      const result = await processor.charge(validPaymentRequest);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorMessage).toBe('Payment method nonce is invalid');
      expect(result.errorCode).toBe('INVALID_PAYMENT_METHOD');
      expect(result.bankId).toBe(BankId.BRAINTREE);
    });

    it('should handle processing exceptions gracefully', async () => {
      // Mock service to simulate exception
      jest.spyOn(mockService, 'generatePaymentResponse').mockImplementation(() => {
        throw new Error('GraphQL connection timeout');
      });

      const result = await processor.charge(validPaymentRequest);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorMessage).toBe('Braintree processing error: GraphQL connection timeout');
      expect(result.errorCode).toBe('BRAINTREE_API_ERROR');
      expect(result.bankId).toBe(BankId.BRAINTREE);
    });
  });

  describe('GraphQL Features', () => {
    const graphqlTestPayment: PaymentRequest = {
      amount: 2000,
      currency: Currency.USD,
      bankId: BankId.BRAINTREE,
      description: 'GraphQL features test',
      referenceId: 'graphql-test-456'
    };

    it('should generate proper GraphQL mutation', () => {
      const spy = jest.spyOn(mockService, 'generatePaymentMutation');
      
      processor.charge(graphqlTestPayment);
      
      expect(spy).toHaveBeenCalled();
      const mutation = spy.mock.results[0].value;
      expect(mutation).toBeDefined();
      expect(mutation).toContain('mutation ChargePaymentMethod');
      expect(mutation).toContain('chargePaymentMethod');
      expect(mutation).toContain('transaction');
    });

    it('should generate proper GraphQL variables', () => {
      const spy = jest.spyOn(mockService, 'generatePaymentVariables');
      
      processor.charge(graphqlTestPayment);
      
      expect(spy).toHaveBeenCalled();
      const variables = spy.mock.results[0].value;
      
      expect(variables.input).toBeDefined();
      expect(variables.input.paymentMethodId).toBe('fake-valid-nonce');
      expect(variables.input.transaction.amount).toBe('20.00'); // Braintree uses dollars
      expect(variables.input.transaction.orderId).toBe('graphql-test-456');
    });

    it('should include all required Braintree headers', () => {
      const spy = jest.spyOn(mockService, 'getRequiredHeaders');
      
      processor.charge(graphqlTestPayment);
      
      expect(spy).toHaveBeenCalled();
      const headers = spy.mock.results[0].value;
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toMatch(/^Basic /);
      expect(headers['Braintree-Version']).toBe('2019-01-01');
    });
  });

  describe('canProcess Method', () => {
    it('should accept payments for Braintree bank ID when enabled', () => {
      const braintreePayment: PaymentRequest = {
        amount: 1000,
        currency: Currency.USD,
        bankId: BankId.BRAINTREE,
        description: 'Braintree test'
      };

      expect(processor.canProcess(braintreePayment)).toBe(true);
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