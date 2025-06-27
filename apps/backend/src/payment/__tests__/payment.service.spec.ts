import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
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

describe('ProcessingService', () => {
  let service: ProcessingService;
  let factory: PaymentProcessorFactoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<ProcessingService>(ProcessingService);
    factory = module.get<PaymentProcessorFactoryImpl>(PaymentProcessorFactoryImpl);
    
    // Mock logger to suppress messages during tests
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Charge Method - Core Task', () => {
    const validPaymentRequest: PaymentRequest = {
      amount: 1000, // $10.00
      currency: Currency.USD,
      bankId: BankId.STRIPE,
      description: 'Test payment',
      referenceId: 'test-ref-123',
      customerDetails: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      }
    };

    it('should process successful payment', async () => {
      const result = await service.charge(validPaymentRequest);

      expect(result).toBeDefined();
      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(result.amount).toBe(1000);
      expect(result.currency).toBe(Currency.USD);
      expect(result.bankId).toBe(BankId.STRIPE);
      expect(result.transactionId).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    it('should handle payment validation errors', async () => {
      const invalidPayment: PaymentRequest = {
        amount: -100, // Invalid negative amount
        currency: Currency.USD,
        bankId: BankId.STRIPE,
        description: 'Invalid payment'
      };

      const result = await service.charge(invalidPayment);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorMessage).toContain('Invalid amount');
      expect(result.errorCode).toBe(ErrorCode.INVALID_REQUEST);
    });

    it('should handle unsupported bank', async () => {
      const unsupportedBankPayment: PaymentRequest = {
        amount: 1000,
        currency: Currency.USD,
        bankId: 'INVALID_BANK' as BankId,
        description: 'Unsupported bank payment'
      };

      const result = await service.charge(unsupportedBankPayment);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorMessage).toContain('Unsupported bank');
      expect(result.errorCode).toBe(ErrorCode.INVALID_REQUEST);
    });

    it('should process payment with all 5 different banks', async () => {
      const banks = [BankId.STRIPE, BankId.PAYPAL, BankId.SQUARE, BankId.ADYEN, BankId.BRAINTREE];

      for (const bankId of banks) {
        const paymentRequest: PaymentRequest = {
          ...validPaymentRequest,
          bankId,
          referenceId: `test-${bankId}-${Date.now()}`
        };

        const result = await service.charge(paymentRequest);

        expect(result).toBeDefined();
        expect(result.bankId).toBe(bankId);
        expect(result.transactionId).toBeDefined();
        expect(result.status).toBe(PaymentStatus.SUCCESS);
      }
    });

    it('should validate required fields', async () => {
      const requestWithoutCurrency: PaymentRequest = {
        amount: 1000,
        currency: '' as Currency,
        bankId: BankId.STRIPE,
        description: 'No currency'
      };

      const result = await service.charge(requestWithoutCurrency);
      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorMessage).toContain('Currency required');
      expect(result.errorCode).toBe(ErrorCode.INVALID_REQUEST);
    });
  });
}); 