import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PaymentService } from '../payment.service';
import { PaymentProcessorFactoryImpl } from '../factories/payment-processor.factory';
import { PaymentRequest, PaymentStatus, Currency, BankId, ErrorCode, HealthStatus } from '@nestjs-payment-gateway/shared';

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

describe('PaymentService', () => {
  let service: PaymentService;
  let factory: PaymentProcessorFactoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<PaymentService>(PaymentService);
    factory = module.get<PaymentProcessorFactoryImpl>(PaymentProcessorFactoryImpl);
    
    // Mock logger to suppress error messages during tests
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Payment Processing', () => {
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
      const result = await service.processPayment(validPaymentRequest);

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

      const result = await service.processPayment(invalidPayment);

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

      const result = await service.processPayment(unsupportedBankPayment);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorMessage).toContain('Unsupported bank');
      expect(result.errorCode).toBe(ErrorCode.INVALID_REQUEST);
    });

    it('should handle disabled processor', async () => {
      // Disable Stripe processor
      factory.disableProcessor(BankId.STRIPE);

      const result = await service.processPayment(validPaymentRequest);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorMessage).toContain('currently disabled');
      expect(result.errorCode).toBe(ErrorCode.INVALID_REQUEST);

      // Re-enable for cleanup
      factory.enableProcessor(BankId.STRIPE);
    });

    it('should process payment with different banks', async () => {
      const banks = [BankId.STRIPE, BankId.PAYPAL, BankId.SQUARE, BankId.ADYEN, BankId.BRAINTREE];

      for (const bankId of banks) {
        const paymentRequest: PaymentRequest = {
          ...validPaymentRequest,
          bankId,
          referenceId: `test-${bankId}-${Date.now()}`
        };

        const result = await service.processPayment(paymentRequest);

        expect(result).toBeDefined();
        expect(result.bankId).toBe(bankId);
        expect(result.transactionId).toBeDefined();
        // All payments should succeed now (no random failures)
        expect(result.status).toBe(PaymentStatus.SUCCESS);
      }
    });
  });

  describe('Auto Payment Processing', () => {
    const autoPaymentRequest = {
      amount: 1500,
      currency: Currency.USD,
      description: 'Auto payment test',
      referenceId: 'auto-test-123'
    };

    it('should process payment with auto bank selection', async () => {
      const result = await service.processPaymentAuto(autoPaymentRequest);

      expect(result).toBeDefined();
      expect(result.bankId).toBeDefined();
      expect(result.amount).toBe(1500);
      expect(result.currency).toBe(Currency.USD);
      expect(result.transactionId).toBeDefined();
    });

    it('should throw error when no processors available', async () => {
      // Disable all processors
      const allBanks = [BankId.STRIPE, BankId.PAYPAL, BankId.SQUARE, BankId.ADYEN, BankId.BRAINTREE];
      allBanks.forEach(bankId => factory.disableProcessor(bankId));

      await expect(service.processPaymentAuto(autoPaymentRequest))
        .rejects.toThrow(ServiceUnavailableException);

      // Re-enable all for cleanup
      allBanks.forEach(bankId => factory.enableProcessor(bankId));
    });
  });

  describe('Available Payment Methods', () => {
    it('should return available payment methods', () => {
      const methods = service.getAvailablePaymentMethods();

      expect(methods).toBeDefined();
      expect(methods.length).toBeGreaterThan(0);
      expect(methods[0]).toHaveProperty('bankId');
      expect(methods[0]).toHaveProperty('name');
      expect(methods[0]).toHaveProperty('enabled');
      expect(methods[0]).toHaveProperty('averageProcessingTime');
      expect(methods[0].enabled).toBe(true); // Only enabled methods returned
    });

    it('should exclude disabled processors from available methods', () => {
      // Disable Stripe
      factory.disableProcessor(BankId.STRIPE);

      const methods = service.getAvailablePaymentMethods();
      const stripeMethod = methods.find(m => m.bankId === BankId.STRIPE);

      expect(stripeMethod).toBeUndefined();

      // Re-enable for cleanup
      factory.enableProcessor(BankId.STRIPE);
    });
  });

  describe('Health Status', () => {
    it('should return healthy status when all processors enabled', () => {
      const health = service.getHealthStatus();

      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.totalProcessors).toBe(5);
      expect(health.healthyProcessors).toBe(5);
      expect(health.processors).toHaveLength(5);
    });

    it('should return degraded status when some processors disabled', () => {
      // Disable 2 processors
      factory.disableProcessor(BankId.STRIPE);
      factory.disableProcessor(BankId.PAYPAL);

      const health = service.getHealthStatus();

      expect(health.status).toBe('degraded');
      expect(health.totalProcessors).toBe(5);
      expect(health.healthyProcessors).toBe(3);

      // Re-enable for cleanup
      factory.enableProcessor(BankId.STRIPE);
      factory.enableProcessor(BankId.PAYPAL);
    });

    it('should return unhealthy status when all processors disabled', () => {
      // Disable all processors
      const allBanks = [BankId.STRIPE, BankId.PAYPAL, BankId.SQUARE, BankId.ADYEN, BankId.BRAINTREE];
      allBanks.forEach(bankId => factory.disableProcessor(bankId));

      const health = service.getHealthStatus();

      expect(health.status).toBe('unhealthy');
      expect(health.healthyProcessors).toBe(0);

      // Re-enable all for cleanup
      allBanks.forEach(bankId => factory.enableProcessor(bankId));
    });
  });

  describe('Statistics', () => {
    it('should return comprehensive statistics', () => {
      const stats = service.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalProcessors).toBe(5);
      expect(stats.enabledProcessors).toBe(5);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      // Simplified stats only have these 3 properties
      expect(stats).toHaveProperty('totalProcessors');
      expect(stats).toHaveProperty('enabledProcessors');
      expect(stats).toHaveProperty('averageResponseTime');
    });
  });

  describe('Processor Management', () => {
    it('should enable and disable processors', async () => {
      // Test enable
      await service.enableProcessor(BankId.STRIPE);
      expect(service.isBankAvailable(BankId.STRIPE)).toBe(true);

      // Test disable
      await service.disableProcessor(BankId.STRIPE);
      expect(service.isBankAvailable(BankId.STRIPE)).toBe(false);

      // Re-enable for cleanup
      await service.enableProcessor(BankId.STRIPE);
    });

    it('should check bank availability', () => {
      expect(service.isBankAvailable(BankId.STRIPE)).toBe(true);
      expect(service.isBankAvailable(BankId.PAYPAL)).toBe(true);
      expect(service.isBankAvailable(BankId.SQUARE)).toBe(true);
      expect(service.isBankAvailable(BankId.ADYEN)).toBe(true);
      expect(service.isBankAvailable(BankId.BRAINTREE)).toBe(true);
    });

    it('should get processor info', () => {
      const info = service.getProcessorInfo(BankId.STRIPE);

      expect(info).toBeDefined();
      expect(info.name).toBeDefined();
      expect(info.type).toBeDefined();
      expect(info.features).toBeDefined();
      expect(info.supported_currencies).toBeDefined();
    });
  });

  describe('Connectivity Testing', () => {
    it('should test connectivity to all processors', async () => {
      const results = await service.testConnectivity();

      expect(results).toBeDefined();
      expect(Object.keys(results)).toHaveLength(5);

      // Check each bank has a result
      expect(results[BankId.STRIPE]).toBeDefined();
      expect(results[BankId.PAYPAL]).toBeDefined();
      expect(results[BankId.SQUARE]).toBeDefined();
      expect(results[BankId.ADYEN]).toBeDefined();
      expect(results[BankId.BRAINTREE]).toBeDefined();

      // Each result should have success property
      Object.values(results).forEach(result => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('responseTime');
      });
    });
  });
}); 