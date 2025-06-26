import { Test, TestingModule } from '@nestjs/testing';
import { StripeProcessor } from '../processors/stripe.processor';
import { StripeMockService } from '../mocks/stripe-mock.service';
import { PaymentRequest, BankId, Currency, PaymentStatus } from '@nestjs-payment-gateway/shared';

describe('StripeProcessor', () => {
  let processor: StripeProcessor;
  let mockService: StripeMockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeProcessor,
        StripeMockService,
      ],
    }).compile();

    processor = module.get<StripeProcessor>(StripeProcessor);
    mockService = module.get<StripeMockService>(StripeMockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Processor Configuration', () => {
    it('should be defined', () => {
      expect(processor).toBeDefined();
      expect(mockService).toBeDefined();
    });

    it('should have correct bank ID', () => {
      expect(processor.bankId).toBe(BankId.STRIPE);
    });

    it('should have correct display name', () => {
      expect(processor.getDisplayName()).toBe('Stripe');
    });

    it('should be enabled by default', () => {
      expect(processor.config.enabled).toBe(true);
    });
  });

  describe('canProcess()', () => {
    it('should return true for Stripe payments', () => {
      const payment: PaymentRequest = {
        bankId: BankId.STRIPE,
        amount: 1000,
        currency: Currency.USD,
      };

      expect(processor.canProcess(payment)).toBe(true);
    });

    it('should return false for non-Stripe payments', () => {
      const payment: PaymentRequest = {
        bankId: BankId.PAYPAL,
        amount: 1000,
        currency: Currency.USD,
      };

      expect(processor.canProcess(payment)).toBe(false);
    });
  });

  describe('charge()', () => {
    const validPayment: PaymentRequest = {
      bankId: BankId.STRIPE,
      amount: 2500, // $25.00
      currency: Currency.USD,
      description: 'Test payment',
      customerDetails: {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
      referenceId: 'TEST_001',
    };

    it('should process successful payment', async () => {
      // Mock the service to return success
      jest.spyOn(mockService, 'generateChargeResponse').mockReturnValue({
        id: 'ch_test123',
        object: 'charge',
        amount: 2500,
        created: Math.floor(Date.now() / 1000),
        currency: 'usd',
        description: 'Test payment',
        status: 'succeeded',
        paid: true,
        metadata: { reference_id: 'TEST_001', gateway_transaction: 'true' },
        outcome: {
          network_status: 'approved_by_network',
          type: 'authorized',
          seller_message: 'Payment complete.',
        },
        payment_method_details: {
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025,
          },
          type: 'card',
        },
      });

      const result = await processor.charge(validPayment);

      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(result.amount).toBe(2500);
      expect(result.currency).toBe(Currency.USD);
      expect(result.bankId).toBe(BankId.STRIPE);
      expect(result.transactionId).toMatch(/^TXN_/);
      expect(result.bankSpecificData).toBeDefined();
      expect(result.bankSpecificData?.originalTransactionId).toBe('ch_test123');
      expect(result.bankSpecificData?.cardBrand).toBe('visa');
      expect(result.bankSpecificData?.cardLast4).toBe('4242');
    });

    it('should process failed payment', async () => {
      // Mock the service to return failure
      jest.spyOn(mockService, 'generateChargeResponse').mockReturnValue({
        id: 'ch_test456',
        object: 'charge',
        amount: 2500,
        created: Math.floor(Date.now() / 1000),
        currency: 'usd',
        description: 'Test payment',
        status: 'failed',
        paid: false,
        failure_code: 'card_declined',
        failure_message: 'Your card was declined.',
        metadata: { reference_id: 'TEST_001', gateway_transaction: 'true' },
        outcome: {
          network_status: 'declined_by_network',
          type: 'issuer_declined',
          seller_message: 'The bank declined the payment.',
        },
        payment_method_details: {
          card: {
            brand: 'visa',
            last4: '0002',
            exp_month: 12,
            exp_year: 2025,
          },
          type: 'card',
        },
      });

      const result = await processor.charge(validPayment);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorMessage).toBe('Your card was declined.');
      expect(result.errorCode).toBe('card_declined');
      expect(result.amount).toBe(2500);
      expect(result.currency).toBe(Currency.USD);
      expect(result.bankId).toBe(BankId.STRIPE);
    });

    it('should include processing time', async () => {
      const result = await processor.charge(validPayment);
      
      expect(result.processingTimeMs).toBeDefined();
      expect(result.processingTimeMs).toBe(200); // Stripe's simulated delay
    });

    it('should include timestamp', async () => {
      const beforeTime = new Date();
      const result = await processor.charge(validPayment);
      const afterTime = new Date();

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should preserve reference ID', async () => {
      const result = await processor.charge(validPayment);
      expect(result.referenceId).toBe('TEST_001');
    });

    it('should handle payments without customer details', async () => {
      const paymentWithoutCustomer: PaymentRequest = {
        bankId: BankId.STRIPE,
        amount: 1000,
        currency: Currency.USD,
      };

      const result = await processor.charge(paymentWithoutCustomer);
      expect(result).toBeDefined();
      expect(result.bankId).toBe(BankId.STRIPE);
    });
  });

  describe('Network Simulation', () => {
    it('should simulate realistic processing delay', async () => {
      const startTime = Date.now();
      await processor.charge({
        bankId: BankId.STRIPE,
        amount: 1000,
        currency: Currency.USD,
      });
      const endTime = Date.now();

      // Should take at least 200ms (Stripe's simulated delay)
      expect(endTime - startTime).toBeGreaterThanOrEqual(190); // Allow small margin
    });
  });
}); 