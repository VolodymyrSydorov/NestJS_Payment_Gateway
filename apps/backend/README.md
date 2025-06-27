# NestJS Payment Gateway Backend

Backend implementation of the payment gateway with ProcessingService that handles 5 different bank processors with unique API formats.

## Russian Task Implementation ✅

This backend implements the exact requirements from the Russian coding task:
- **ProcessingService** with single public method `charge()`
- **5 Different Banks** with unique API formats
- **Complete Type Definitions** for all requests/responses

## Core Architecture

### ProcessingService
The main service class with a single public method as required:

```typescript
@Injectable()
export class ProcessingService {
  async charge(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    // Unified payment processing for all 5 banks
  }
}
```

### Payment Processors (5 Different API Formats)

Each processor implements a different API format to demonstrate integration flexibility:

1. **StripeProcessor** - REST API with JSON
2. **PayPalProcessor** - SOAP/XML format
3. **SquareProcessor** - Custom API with special headers
4. **AdyenProcessor** - HMAC signature authentication
5. **BraintreeProcessor** - GraphQL API

### API Endpoint

```
POST /payments/charge
```

## Request/Response Types

### PaymentRequest
```typescript
interface PaymentRequest {
  amount: number;         // Amount in cents
  currency: Currency;     // USD, EUR, GBP, JPY, AUD, CAD
  bankId: BankId;        // STRIPE, PAYPAL, SQUARE, ADYEN, BRAINTREE
  description?: string;
  referenceId?: string;
  customerDetails?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}
```

### PaymentResponse
```typescript
interface PaymentResponse {
  status: PaymentStatus;       // SUCCESS, FAILED, PENDING
  transactionId: string;
  amount: number;
  currency: Currency;
  bankId: BankId;
  timestamp: Date;
  processingTimeMs: number;
  errorMessage?: string;
  errorCode?: ErrorCode;
}
```

## Development

### Installation
```bash
npm install
```

### Running
```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

### Testing
```bash
# Run all tests (91 tests)
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

## Project Structure

```
src/
├── payment/
│   ├── payment.service.ts          # ProcessingService with charge method
│   ├── payment.controller.ts       # REST controller with /charge endpoint
│   ├── payment.module.ts          # Module configuration
│   ├── processors/                # 5 bank processors
│   │   ├── stripe.processor.ts
│   │   ├── paypal.processor.ts
│   │   ├── square.processor.ts
│   │   ├── adyen.processor.ts
│   │   └── braintree.processor.ts
│   ├── factories/                 # Factory pattern
│   │   └── payment-processor.factory.ts
│   ├── mocks/                     # Mock services for testing
│   └── __tests__/                 # Comprehensive test suite
└── main.ts                        # Application bootstrap
```

## Bank Processor Details

### Stripe (REST JSON)
- Standard REST API calls
- JSON request/response
- ~200ms average processing time

### PayPal (SOAP XML)
- SOAP-based API
- XML request/response format
- ~2000ms average processing time

### Square (Custom API)
- Custom JSON format with special headers
- Bearer token authentication
- ~500ms average processing time

### Adyen (HMAC Auth)
- REST with HMAC signature verification
- Security-focused authentication
- ~300ms average processing time

### Braintree (GraphQL)
- GraphQL query-based API
- Structured query language
- ~400ms average processing time

## Key Features

✅ **Task Compliance**
- Single ProcessingService.charge() method
- 5 different bank API formats
- Complete TypeScript type definitions
- Proper error handling and validation

✅ **Code Quality**
- Zero magic strings (all enums)
- Comprehensive test coverage (91 tests)
- Clean architecture with factory pattern
- TypeScript strict mode

✅ **Production Ready**
- Proper error handling
- Logging and monitoring
- CORS configuration
- Input validation

## Example Usage

```bash
curl -X POST http://localhost:3000/payments/charge \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "USD",
    "bankId": "STRIPE",
    "description": "Test payment"
  }'
```

Response:
```json
{
  "status": "SUCCESS",
  "transactionId": "txn_1234567890",
  "amount": 1000,
  "currency": "USD",
  "bankId": "STRIPE",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "processingTimeMs": 250
}
```
