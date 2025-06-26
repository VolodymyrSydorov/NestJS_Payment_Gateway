import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from '../payment.controller';
import { PaymentService } from '../payment.service';
import { PaymentProcessorFactoryImpl } from '../factories/payment-processor.factory';
import { PaymentRequest, PaymentStatus, Currency, BankId } from '@nestjs-payment-gateway/shared';

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
  let service: PaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        PaymentService,
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
    service = module.get<PaymentService>(PaymentService);
    
    // Mock logger to suppress messages during tests
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('POST /payments', () => {
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

    it('should process payment successfully', async () => {
      const result = await controller.processPayment(validPaymentRequest);

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

      const result = await controller.processPayment(invalidPayment);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorCode).toBe('INVALID_REQUEST');
      expect(result.errorMessage).toBeDefined();
    });
  });

  describe('POST /payments/auto', () => {
    const autoPaymentRequest = {
      amount: 1500,
      currency: Currency.USD,
      description: 'Auto payment test from controller',
      referenceId: 'auto-ctrl-123'
    };

    it('should process payment with auto bank selection', async () => {
      const result = await controller.processPaymentAuto(autoPaymentRequest);

      expect(result).toBeDefined();
      expect(result.amount).toBe(1500);
      expect(result.currency).toBe(Currency.USD);
      expect(result.bankId).toBeDefined();
      expect(result.transactionId).toBeDefined();
      expect([PaymentStatus.SUCCESS, PaymentStatus.FAILED]).toContain(result.status);
    });
  });

  describe('GET /payments/methods', () => {
    it('should return available payment methods', async () => {
      const response = await controller.getAvailablePaymentMethods();

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      
      // Check structure of first method
      expect(response.data[0]).toHaveProperty('bankId');
      expect(response.data[0]).toHaveProperty('name');
      expect(response.data[0]).toHaveProperty('displayName');
      expect(response.data[0]).toHaveProperty('enabled');
      expect(response.data[0].enabled).toBe(true);
    });
  });

  describe('GET /payments/health', () => {
    it('should return health status', async () => {
      const response = await controller.getHealthStatus();

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.data.status);
      expect(response.data.totalProcessors).toBe(5);
      expect(response.data.healthyProcessors).toBeGreaterThanOrEqual(0);
      expect(response.data.processors).toHaveLength(5);
      expect(response.timestamp).toBeDefined();
    });
  });

  describe('GET /payments/stats', () => {
    it('should return comprehensive statistics', async () => {
      const response = await controller.getStatistics();

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.totalProcessors).toBe(5);
      expect(response.data.enabledProcessors).toBeGreaterThanOrEqual(0);
      expect(response.data.disabledProcessors).toBeGreaterThanOrEqual(0);
      expect(response.data.protocolBreakdown).toBeDefined();
      expect(response.data.averageResponseTime).toBeGreaterThan(0);
      expect(response.data.supportedCurrencies).toBeDefined();
      expect(response.data.supportedFeatures).toBeDefined();
      expect(response.data.supportedCurrencies).toContain('USD');
    });
  });

  describe('PUT /payments/processors/:bankId/enable', () => {
    it('should enable a processor', async () => {
      const response = await controller.enableProcessor(BankId.STRIPE);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.message).toContain('enabled');
    });
  });

  describe('PUT /payments/processors/:bankId/disable', () => {
    it('should disable a processor', async () => {
      const response = await controller.disableProcessor(BankId.PAYPAL);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.message).toContain('disabled');
    });
  });

  describe('GET /payments/processors/:bankId/info', () => {
    it('should return processor information', async () => {
      const response = await controller.getProcessorInfo(BankId.STRIPE);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.name).toBeDefined();
      expect(response.data.type).toBeDefined();
      expect(response.data.features).toBeDefined();
      expect(response.data.supported_currencies).toBeDefined();
    });
  });

  describe('GET /payments/connectivity', () => {
    it('should test connectivity to all processors', async () => {
      const response = await controller.testConnectivity();

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.results).toBeDefined();
      expect(Object.keys(response.data.results)).toHaveLength(5);

      // Check each bank has a result
      expect(response.data.results[BankId.STRIPE]).toBeDefined();
      expect(response.data.results[BankId.PAYPAL]).toBeDefined();
      expect(response.data.results[BankId.SQUARE]).toBeDefined();
      expect(response.data.results[BankId.ADYEN]).toBeDefined();
      expect(response.data.results[BankId.BRAINTREE]).toBeDefined();

      // Each result should have success property
      Object.values(response.data.results).forEach(result => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('responseTime');
      });
    });
  });

  describe('Bank Availability', () => {
    it('should check if banks are available', async () => {
      // All should be available initially
      expect(service.isBankAvailable(BankId.STRIPE)).toBe(true);
      expect(service.isBankAvailable(BankId.PAYPAL)).toBe(true);
      expect(service.isBankAvailable(BankId.SQUARE)).toBe(true);
      expect(service.isBankAvailable(BankId.ADYEN)).toBe(true);
      expect(service.isBankAvailable(BankId.BRAINTREE)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle payment with unsupported bank', async () => {
      const invalidBankPayment: PaymentRequest = {
        amount: 1000,
        currency: Currency.USD,
        bankId: 'INVALID_BANK' as BankId,
        description: 'Invalid bank test'
      };

      const result = await controller.processPayment(invalidBankPayment);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorCode).toBe('INVALID_REQUEST');
      expect(result.errorMessage).toContain('Unsupported bank');
    });

    it('should handle zero amount payment', async () => {
      const zeroAmountPayment: PaymentRequest = {
        amount: 0,
        currency: Currency.USD,
        bankId: BankId.STRIPE,
        description: 'Zero amount test'
      };

      const result = await controller.processPayment(zeroAmountPayment);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorCode).toBe('INVALID_REQUEST');
    });
  });

  describe('Multiple Currencies', () => {
    it('should handle different currencies', async () => {
      const currencies = [Currency.USD, Currency.EUR, Currency.GBP, Currency.UAH];

      for (const currency of currencies) {
        const paymentRequest: PaymentRequest = {
          amount: 1000,
          currency,
          bankId: BankId.STRIPE,
          description: `Test payment in ${currency}`,
          referenceId: `test-${currency}-${Date.now()}`
        };

        const result = await controller.processPayment(paymentRequest);

        expect(result).toBeDefined();
        expect(result.currency).toBe(currency);
        expect([PaymentStatus.SUCCESS, PaymentStatus.FAILED]).toContain(result.status);
      }
    });
  });

  describe('Multiple Banks', () => {
    it('should process payments through all available banks', async () => {
      const banks = [BankId.STRIPE, BankId.PAYPAL, BankId.SQUARE, BankId.ADYEN, BankId.BRAINTREE];

      for (const bankId of banks) {
        const paymentRequest: PaymentRequest = {
          amount: 1500,
          currency: Currency.USD,
          bankId,
          description: `Test payment via ${bankId}`,
          referenceId: `test-${bankId}-${Date.now()}`
        };

        const result = await controller.processPayment(paymentRequest);

        expect(result).toBeDefined();
        expect(result.bankId).toBe(bankId);
        expect(result.transactionId).toBeDefined();
        expect([PaymentStatus.SUCCESS, PaymentStatus.FAILED]).toContain(result.status);
      }
    });
  });
}); 