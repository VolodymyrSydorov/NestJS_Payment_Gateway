import { Injectable, Logger } from '@nestjs/common';
import { PaymentProcessorFactory, PaymentProcessor, BankId } from '@nestjs-payment-gateway/shared';
import { StripeProcessor } from '../processors/stripe.processor';
import { PayPalProcessor } from '../processors/paypal.processor';
import { SquareProcessor } from '../processors/square.processor';
import { AdyenProcessor } from '../processors/adyen.processor';
import { BraintreeProcessor } from '../processors/braintree.processor';

/**
 * Payment Processor Factory
 * Task: Create processors for 5 different banks with different API formats
 */
@Injectable()
export class PaymentProcessorFactoryImpl implements PaymentProcessorFactory {
  private readonly logger = new Logger(PaymentProcessorFactoryImpl.name);
  private readonly processors = new Map<BankId, PaymentProcessor>();

  constructor(
    private readonly stripeProcessor: StripeProcessor,
    private readonly paypalProcessor: PayPalProcessor,
    private readonly squareProcessor: SquareProcessor,
    private readonly adyenProcessor: AdyenProcessor,
    private readonly braintreeProcessor: BraintreeProcessor,
  ) {
    this.initializeProcessors();
    this.logger.log('Factory initialized with 5 processors');
  }

  /**
   * Initialize the 5 different bank processors
   */
  private initializeProcessors(): void {
    this.processors.set(BankId.STRIPE, this.stripeProcessor);
    this.processors.set(BankId.PAYPAL, this.paypalProcessor);
    this.processors.set(BankId.SQUARE, this.squareProcessor);
    this.processors.set(BankId.ADYEN, this.adyenProcessor);
    this.processors.set(BankId.BRAINTREE, this.braintreeProcessor);
  }

  /**
   * CORE TASK METHOD: Create processor for specific bank
   * Each bank handles different API format (REST, SOAP, GraphQL, etc.)
   */
  createProcessor(bankId: BankId): PaymentProcessor {
    const processor = this.processors.get(bankId);
    if (!processor) {
      const available = Array.from(this.processors.keys()).join(', ');
      throw new Error(`Unsupported bank: ${bankId}. Available: ${available}`);
    }
    return processor;
  }

  // === MINIMAL INTERFACE REQUIREMENTS ===
  
  getAllProcessors(): PaymentProcessor[] {
    return Array.from(this.processors.values());
  }

  getSupportedBanks(): BankId[] {
    return Array.from(this.processors.keys());
  }

  isSupported(bankId: BankId): boolean {
    return this.processors.has(bankId);
  }
} 