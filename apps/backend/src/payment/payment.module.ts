import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentProcessorFactoryImpl } from './factories/payment-processor.factory';

// Import all payment processors
import { StripeProcessor } from './processors/stripe.processor';
import { PayPalProcessor } from './processors/paypal.processor';
import { SquareProcessor } from './processors/square.processor';
import { AdyenProcessor } from './processors/adyen.processor';
import { BraintreeProcessor } from './processors/braintree.processor';

// Import all mock services
import { StripeMockService } from './mocks/stripe-mock.service';
import { PayPalMockService } from './mocks/paypal-mock.service';
import { SquareMockService } from './mocks/square-mock.service';
import { AdyenMockService } from './mocks/adyen-mock.service';
import { BraintreeMockService } from './mocks/braintree-mock.service';

/**
 * Payment Module
 * Comprehensive payment processing module that provides:
 * - 5 different payment processors (Stripe, PayPal, Square, Adyen, Braintree)
 * - Factory pattern for dynamic processor selection
 * - Unified payment service with validation and error handling
 * - REST API controller with comprehensive endpoints
 * - Mock services for realistic protocol simulation
 * 
 * Features:
 * - Multi-protocol support (REST JSON, SOAP XML, Custom Headers, HMAC Auth, GraphQL)
 * - Type-safe shared interfaces
 * - Professional error handling and logging
 * - Health monitoring and statistics
 * - Processor management (enable/disable)
 * - Automatic bank selection
 */
@Module({
  imports: [],
  controllers: [PaymentController],
  providers: [
    // Core payment services
    PaymentService,
    PaymentProcessorFactoryImpl,
    
    // Payment processors
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
  exports: [
    // Export main services for potential use in other modules
    PaymentService,
    PaymentProcessorFactoryImpl,
    
    // Export all processors in case other modules need direct access
    StripeProcessor,
    PayPalProcessor,
    SquareProcessor,
    AdyenProcessor,
    BraintreeProcessor,
  ],
})
export class PaymentModule {
  constructor() {
    console.log('🚀 Payment Module initialized with 5 processors');
    console.log('📋 Supported protocols: REST JSON, SOAP XML, Custom Headers, HMAC Auth, GraphQL');
    console.log('🏦 Supported banks: Stripe, PayPal, Square, Adyen, Braintree');
  }
} 