# Shared Interfaces for Payment Gateway

This directory contains all shared TypeScript interfaces, DTOs, enums, and utilities used by both the NestJS backend and Angular frontend.

## 📁 Directory Structure

```
shared/
├── dto/                           # Data Transfer Objects
│   ├── charge.dto.ts             # Payment charge request structure
│   ├── payment-response.dto.ts   # Unified payment response structure
│   └── index.ts
├── enums/                        # Enumerations
│   ├── payment-status.enum.ts    # Payment status values
│   ├── bank-id.enum.ts           # Supported bank identifiers
│   ├── currency.enum.ts          # Supported currencies
│   └── index.ts
├── interfaces/                   # TypeScript interfaces
│   ├── payment-processor.interface.ts         # Bank processor contract
│   ├── payment-processor-factory.interface.ts # Factory pattern interface
│   └── index.ts
├── utils/                        # Shared utilities
│   ├── validation.utils.ts       # Validation functions
│   └── index.ts
├── index.ts                      # Main export file
└── README.md                     # This file
```

## 🏦 Supported Banks

- **Stripe** - REST JSON API
- **PayPal** - SOAP/XML API  
- **Square** - Custom JSON with special headers
- **Adyen** - Custom authentication flow
- **Braintree** - GraphQL API

## 💰 Supported Currencies

- USD (US Dollar) - $
- EUR (Euro) - €
- GBP (British Pound) - £
- UAH (Ukrainian Hryvnia) - ₴

## 🎯 Payment Status Values

- `SUCCESS` - Payment completed successfully
- `FAILED` - Payment failed
- `PENDING` - Payment is being processed
- `CANCELLED` - Payment was cancelled
- `TIMEOUT` - Payment timed out

## 🔧 Usage in Backend (NestJS)

```typescript
import { ChargeDto, PaymentResponse, BankId } from '@shared';

@Controller('payment')
export class PaymentController {
  async charge(@Body() chargeDto: ChargeDto): Promise<PaymentResponse> {
    // Implementation
  }
}
```

## 🎨 Usage in Frontend (Angular)

```typescript
import { signal } from '@angular/core';
import { ChargeDto, PaymentResponse, BankId } from '@shared';

export class PaymentComponent {
  readonly selectedBank = signal<BankId>(BankId.STRIPE);
  readonly paymentResult = signal<PaymentResponse | null>(null);
}
```

## ✅ Validation

Use the shared validation utilities:

```typescript
import { ValidationUtils } from '@shared';

const result = ValidationUtils.validateChargeDto(chargeData);
if (!result.isValid) {
  console.log(result.errors);
}
```

## 🔄 Benefits

- **Type Safety** - Same interfaces everywhere
- **Single Source of Truth** - No duplication
- **Refactoring Safety** - Change once, update everywhere
- **Developer Experience** - Perfect auto-completion
- **Consistency** - Unified data structures across the stack

This architecture ensures our payment gateway maintains perfect type safety from the database to the UI! 🚀 