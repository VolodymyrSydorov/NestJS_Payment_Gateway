import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from '../payment.controller';
import { ProcessingService } from '../payment.service';
import { PaymentProcessorFactoryImpl } from '../factories/payment-processor.factory';
import { PaymentRequest, PaymentStatus, Currency, BankId, ErrorCode } from '@nestjs-payment-gateway/shared';

// Import processors and their mocks
import { StripeProcessor } from '../processors/stripe.processor';
import { PayPalProcessor } from '../processors/paypal.processor';
import { SquareProcessor } from '../processors/square.processor';
import { AdyenProcessor } from '../processors/adyen.processor';
import { BraintreeProcessor } from '../processors/braintree.processor';

import { StripeMockService } from '../mocks/stripe-mock.service';
import { PayPalMockService } from '../mocks/paypal-mock.service';
import { SquareMockService } from '../mocks/square-mock.service';
import { AdyenMockService } from '../mocks/adyen-mock.service';
import { BraintreeMockService } from '../mocks/braintree-mock.service';

describe('PaymentController', () => {
  let controller: PaymentController;
  let service: ProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        ProcessingService,
        PaymentProcessorFactoryImpl,
        
        // Processors
        StripeProcessor,
        PayPalProcessor,
        SquareProcessor,
        AdyenProcessor,
        BraintreeProcessor,
        
        // Mock services
        StripeMockService,
        PayPalMockService,
        SquareMockService,
        AdyenMockService,
        BraintreeMockService,
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    service = module.get<ProcessingService>(ProcessingService);
    
    // Mock logger to suppress messages during tests
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('Charge Endpoint - Core Task', () => {
    const validPaymentRequest: PaymentRequest = {
      amount: 2000, // $20.00
      currency: Currency.USD,
      bankId: BankId.STRIPE,
      description: 'Controller test payment',
      referenceId: 'ctrl-test-123',
      customerDetails: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com'
      }
    };

    it('should process payment successfully via charge endpoint', async () => {
      const result = await controller.charge(validPaymentRequest);

      expect(result).toBeDefined();
      expect(result.amount).toBe(2000);
      expect(result.currency).toBe(Currency.USD);
      expect(result.bankId).toBe(BankId.STRIPE);
      expect(result.transactionId).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect([PaymentStatus.SUCCESS, PaymentStatus.FAILED]).toContain(result.status);
    });

    it('should handle invalid payment request', async () => {
      const invalidPayment: PaymentRequest = {
        amount: -500, // Invalid negative amount
        currency: Currency.USD,
        bankId: BankId.STRIPE,
        description: 'Invalid payment'
      };

      const result = await controller.charge(invalidPayment);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorCode).toBe(ErrorCode.INVALID_REQUEST);
      expect(result.errorMessage).toBeDefined();
    });

    it('should handle payments for all 5 different banks', async () => {
      const banks = [BankId.STRIPE, BankId.PAYPAL, BankId.SQUARE, BankId.ADYEN, BankId.BRAINTREE];

      for (const bankId of banks) {
        const paymentRequest: PaymentRequest = {
          ...validPaymentRequest,
          bankId,
          referenceId: `ctrl-test-${bankId}-${Date.now()}`
        };

        const result = await controller.charge(paymentRequest);

        expect(result).toBeDefined();
        expect(result.bankId).toBe(bankId);
        expect(result.transactionId).toBeDefined();
        expect([PaymentStatus.SUCCESS, PaymentStatus.FAILED]).toContain(result.status);
      }
    });

    it('should handle unsupported bank', async () => {
      const unsupportedBankPayment: PaymentRequest = {
        amount: 1000,
        currency: Currency.USD,
        bankId: 'INVALID_BANK' as BankId,
        description: 'Unsupported bank test'
      };

      const result = await controller.charge(unsupportedBankPayment);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorCode).toBe(ErrorCode.INVALID_REQUEST);
      expect(result.errorMessage).toContain('Unsupported bank');
    });
  });
}); 