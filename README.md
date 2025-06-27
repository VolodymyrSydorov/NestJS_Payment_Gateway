# NestJS Payment Gateway

A simplified payment gateway implementation that connects 5 different banks with different API formats, as required by the Russian coding task.

## Russian Task Requirements ✅

> Реализуйте платёжный шлюз, подключающий 5 разных банков, каждый из которых имеет свой формат API, структуру запроса и ответа. Требуется реализовать ProcessingService с единым публичным методом charge. описать типы и форматы ответов. (NestJs)

**Translation:** Implement a payment gateway connecting 5 different banks with different API formats. Need ProcessingService with single public method "charge" and describe types/response formats.

## Implementation Overview

### Core Architecture
- **ProcessingService** with single `charge()` method
- **5 Different Banks** with unique API formats:
  - Stripe (REST API)
  - PayPal (SOAP)
  - Square (Custom API)
  - Adyen (HMAC Authentication)
  - Braintree (GraphQL)

### API Endpoint
```
POST /payments/charge
```

### Project Structure
```
apps/
├── backend/          # NestJS API with ProcessingService
└── frontend/         # Angular payment form
shared/               # Common types and DTOs
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
npm install
```

### Development
```bash
# Start both backend and frontend
npm run dev

# Or start individually
npm run dev:backend   # Backend on port 3000
npm run dev:frontend  # Frontend on port 4200
```

### Testing
```bash
# Test backend
cd apps/backend && npm test

# Test frontend  
cd apps/frontend && npm test
```

## API Usage

### Request Format
```typescript
interface PaymentRequest {
  amount: number;        // Amount in cents
  currency: Currency;    // USD, EUR, GBP, JPY, AUD, CAD
  bankId: BankId;       // STRIPE, PAYPAL, SQUARE, ADYEN, BRAINTREE
  description?: string;
  referenceId?: string;
  customerDetails?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}
```

### Response Format
```typescript
interface PaymentResponse {
  status: PaymentStatus;      // SUCCESS, FAILED, PENDING
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

### Example Usage
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

## Bank Processors

Each bank implements a different API format to demonstrate the gateway's flexibility:

| Bank | API Format | Auth Method | Request Structure |
|------|------------|-------------|-------------------|
| Stripe | REST | API Key | Standard JSON |
| PayPal | SOAP | OAuth | XML-based |
| Square | Custom | Bearer Token | Nested objects |
| Adyen | REST | HMAC | Signature verification |
| Braintree | GraphQL | API Key | Query-based |

## Technology Stack

- **Backend:** NestJS, TypeScript
- **Frontend:** Angular 18, Material Design
- **Shared:** TypeScript interfaces, DTOs
- **Testing:** Jest, Angular Testing
- **Code Quality:** ESLint, Prettier

## Key Features

✅ **Task Compliance**
- ProcessingService with single charge method
- 5 different bank APIs with unique formats
- Complete type definitions
- Proper error handling

✅ **Code Quality**
- Zero magic strings (all enums)
- Comprehensive test coverage
- Clean architecture
- TypeScript strict mode

✅ **Developer Experience**
- Monorepo structure
- Shared types between FE/BE
- Hot reload development
- Detailed documentation

## Architecture Decisions

This implementation prioritizes simplicity and task compliance over enterprise features. The focus is on demonstrating:

1. **Multiple API Formats** - Each bank uses different request/response structures
2. **Single Interface** - ProcessingService.charge() handles all banks
3. **Type Safety** - Complete TypeScript coverage
4. **Clean Code** - No magic strings, proper error handling

## Development Scripts

```bash
# Root level commands
npm run dev                 # Start both services
npm run dev:backend        # Backend only
npm run dev:frontend       # Frontend only
npm run build              # Build all packages
npm run test               # Test all packages

# Individual package commands
cd apps/backend && npm test
cd apps/frontend && npm test
cd shared && npm run build
``` 