import { Injectable } from '@nestjs/common';
import { Currency } from '@nestjs-payment-gateway/shared';

@Injectable()
export class AppService {
  getApiInfo() {
    return {
      name: 'NestJS Payment Gateway API',
      version: '1.0.0',
      description: 'Multi-processor payment gateway supporting 5 banks',
      endpoints: {
        payments: '/payments',
        health: '/payments/health',
        methods: '/payments/methods',
        statistics: '/payments/statistics'
      },
      supportedProcessors: ['stripe', 'paypal', 'square', 'adyen', 'braintree'],
      supportedCurrencies: [Currency.USD, Currency.EUR, Currency.GBP, Currency.JPY, Currency.AUD, Currency.CAD],
      documentation: 'See README.md for full API documentation'
    };
  }

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'payment-gateway-api'
    };
  }
}
