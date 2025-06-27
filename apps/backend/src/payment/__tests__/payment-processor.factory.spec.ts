import { Test, TestingModule } from '@nestjs/testing';
import { PaymentProcessorFactoryImpl } from '../factories/payment-processor.factory';
import { BankId } from '@nestjs-payment-gateway/shared';

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

describe('PaymentProcessorFactoryImpl', () => {
  let factory: PaymentProcessorFactoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
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

    factory = module.get<PaymentProcessorFactoryImpl>(PaymentProcessorFactoryImpl);
    
    // Mock logger to suppress error messages during tests
    jest.spyOn(factory['logger'], 'error').mockImplementation(() => {});
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(factory).toBeDefined();
    });

    it('should register all 5 processors', () => {
      const allProcessors = factory.getAllProcessors();
      expect(allProcessors).toHaveLength(5);
    });

    it('should support all expected bank IDs', () => {
      const supportedBanks = factory.getSupportedBanks();
      expect(supportedBanks).toContain(BankId.STRIPE);
      expect(supportedBanks).toContain(BankId.PAYPAL);
      expect(supportedBanks).toContain(BankId.SQUARE);
      expect(supportedBanks).toContain(BankId.ADYEN);
      expect(supportedBanks).toContain(BankId.BRAINTREE);
      expect(supportedBanks).toHaveLength(5);
    });
  });

  describe('Processor Creation', () => {
    it('should create Stripe processor', () => {
      const processor = factory.createProcessor(BankId.STRIPE);
      expect(processor).toBeDefined();
      expect(processor.bankId).toBe(BankId.STRIPE);
      expect(processor.getDisplayName()).toBe('Stripe');
    });

    it('should create PayPal processor', () => {
      const processor = factory.createProcessor(BankId.PAYPAL);
      expect(processor).toBeDefined();
      expect(processor.bankId).toBe(BankId.PAYPAL);
      expect(processor.getDisplayName()).toBe('PayPal');
    });

    it('should create Square processor', () => {
      const processor = factory.createProcessor(BankId.SQUARE);
      expect(processor).toBeDefined();
      expect(processor.bankId).toBe(BankId.SQUARE);
      expect(processor.getDisplayName()).toBe('Square Payments');
    });

    it('should create Adyen processor', () => {
      const processor = factory.createProcessor(BankId.ADYEN);
      expect(processor).toBeDefined();
      expect(processor.bankId).toBe(BankId.ADYEN);
      expect(processor.getDisplayName()).toBe('Adyen Global Payments');
    });

    it('should create Braintree processor', () => {
      const processor = factory.createProcessor(BankId.BRAINTREE);
      expect(processor).toBeDefined();
      expect(processor.bankId).toBe(BankId.BRAINTREE);
      expect(processor.getDisplayName()).toBe('Braintree Payments (PayPal)');
    });

    it('should throw error for unsupported bank', () => {
      expect(() => {
        factory.createProcessor('INVALID_BANK' as BankId);
      }).toThrow('Unsupported bank: INVALID_BANK');
    });
  });

  describe('Bank Support Checks', () => {
    it('should return true for supported banks', () => {
      expect(factory.isSupported(BankId.STRIPE)).toBe(true);
      expect(factory.isSupported(BankId.PAYPAL)).toBe(true);
      expect(factory.isSupported(BankId.SQUARE)).toBe(true);
      expect(factory.isSupported(BankId.ADYEN)).toBe(true);
      expect(factory.isSupported(BankId.BRAINTREE)).toBe(true);
    });

    it('should return false for unsupported banks', () => {
      expect(factory.isSupported('INVALID_BANK' as BankId)).toBe(false);
    });

    it('should check individual bank support', () => {
      expect(factory.isBankSupported(BankId.STRIPE)).toBe(true);
      expect(factory.isBankSupported('INVALID_BANK' as BankId)).toBe(false);
    });

    it('should check individual bank enabled status', () => {
      expect(factory.isBankEnabled(BankId.STRIPE)).toBe(true);
      expect(factory.isBankEnabled(BankId.PAYPAL)).toBe(true);
    });
  });

  describe('Processor Management', () => {
    it('should enable and disable processors', () => {
      // Disable Stripe
      factory.disableProcessor(BankId.STRIPE);
      expect(factory.isBankEnabled(BankId.STRIPE)).toBe(false);

      // Enable Stripe
      factory.enableProcessor(BankId.STRIPE);
      expect(factory.isBankEnabled(BankId.STRIPE)).toBe(true);
    });

    it('should throw error when enabling invalid bank', () => {
      expect(() => {
        factory.enableProcessor('INVALID_BANK' as BankId);
      }).toThrow('Processor not found: INVALID_BANK');
    });

    it('should throw error when disabling invalid bank', () => {
      expect(() => {
        factory.disableProcessor('INVALID_BANK' as BankId);
      }).toThrow('Processor not found: INVALID_BANK');
    });

    it('should refuse to create processor when disabled', () => {
      // Disable Stripe
      factory.disableProcessor(BankId.STRIPE);

      expect(() => {
        factory.createProcessor(BankId.STRIPE);
      }).toThrow('Bank stripe is currently disabled');

      // Re-enable for cleanup
      factory.enableProcessor(BankId.STRIPE);
    });
  });

  describe('Processor Information', () => {
    it('should return processor summary', () => {
      const summary = factory.getProcessorsSummary();
      
      expect(summary).toHaveLength(5);
      expect(summary[0]).toHaveProperty('bankId');
      expect(summary[0]).toHaveProperty('name');
      expect(summary[0]).toHaveProperty('enabled');
      expect(summary[0]).toHaveProperty('averageProcessingTime');
      
      // Verify using BankId enum
      const stripeProcessor = summary.find(p => p.bankId === BankId.STRIPE);
      expect(stripeProcessor).toBeDefined();
      expect(stripeProcessor!.name).toBe('Stripe');
      expect(stripeProcessor!.enabled).toBe(true);
    });

    it('should get enabled processors only', () => {
      // Disable one processor
      factory.disableProcessor(BankId.STRIPE);
      
      const enabledProcessors = factory.getEnabledProcessors();
      expect(enabledProcessors).toHaveLength(4);
      
      const enabledBankIds = enabledProcessors.map(p => p.bankId);
      expect(enabledBankIds).toHaveLength(4);
      expect(enabledBankIds).not.toContain(BankId.STRIPE);
      
      // Re-enable for cleanup
      factory.enableProcessor(BankId.STRIPE);
    });
  });
}); 