# Shared Interfaces Strategy for Payment Gateway

## 🎯 **Overview**
Sharing common interfaces between frontend and backend ensures type safety, reduces duplication, and maintains consistency across the full stack.

---

## 📁 **Project Structure with Shared Interfaces**

```
NestJS_Payment_Gateway/
├── shared/                    # 🆕 Shared interfaces
│   ├── interfaces/
│   │   ├── payment-processor.interface.ts
│   │   └── bank-config.interface.ts
│   ├── dto/
│   │   ├── charge.dto.ts
│   │   ├── payment-response.dto.ts
│   │   └── bank-specific.dto.ts
│   └── enums/
│       ├── payment-status.enum.ts
│       └── bank-id.enum.ts
├── backend/
│   ├── src/payment/
│   │   ├── processors/
│   │   ├── factories/
│   │   └── processing.service.ts
│   └── package.json
├── frontend/
│   ├── src/app/payment/
│   │   ├── components/
│   │   └── services/
│   └── package.json
└── README.md
```

---

## 🔧 **Shared Interface Definitions**

### **Payment DTOs** (`shared/dto/`)

**`charge.dto.ts`**:
```typescript
export interface ChargeDto {
  bankId: string;
  amount: number;
  currency: string;
  customerDetails?: {
    id?: string;
    email?: string;
  };
}
```

**`payment-response.dto.ts`**:
```typescript
export interface PaymentResponse {
  transactionId: string;
  status: 'success' | 'failed' | 'pending';
  amount: number;
  currency: string;
  timestamp: Date;
  bankSpecificData?: any;
  errorMessage?: string;
}
```

### **Enums** (`shared/enums/`)

**`payment-status.enum.ts`**:
```typescript
export enum PaymentStatus {
  SUCCESS = 'success',
  FAILED = 'failed', 
  PENDING = 'pending'
}
```

**`bank-id.enum.ts`**:
```typescript
export enum BankId {
  BANK_A = 'bank_a',
  BANK_B = 'bank_b',
  BANK_C = 'bank_c',
  BANK_D = 'bank_d',
  BANK_E = 'bank_e'
}
```

### **Core Interfaces** (`shared/interfaces/`)

**`payment-processor.interface.ts`**:
```typescript
import { ChargeDto } from '../dto/charge.dto';
import { PaymentResponse } from '../dto/payment-response.dto';

export interface PaymentProcessor {
  charge(payload: ChargeDto): Promise<PaymentResponse>;
}
```

---

## 🔄 **Usage in Backend**

### **NestJS Service**
```typescript
// backend/src/payment/processing.service.ts
import { ChargeDto, PaymentResponse } from '../../../shared/dto';
import { PaymentProcessor } from '../../../shared/interfaces';

@Injectable()
export class ProcessingService {
  async charge(chargeDto: ChargeDto): Promise<PaymentResponse> {
    // Implementation uses shared interfaces
  }
}
```

### **Bank Processors**
```typescript
// backend/src/payment/processors/bank-a.processor.ts
import { PaymentProcessor } from '../../../../shared/interfaces';
import { ChargeDto, PaymentResponse } from '../../../../shared/dto';

@Injectable()
export class BankAProcessor implements PaymentProcessor {
  async charge(payload: ChargeDto): Promise<PaymentResponse> {
    // Implementation
  }
}
```

---

## 🎨 **Usage in Frontend**

### **Angular Service with Signals**
```typescript
// frontend/src/app/payment/services/payment.service.ts
import { signal, computed } from '@angular/core';
import { ChargeDto, PaymentResponse } from '../../../../shared/dto';
import { PaymentStatus } from '../../../../shared/enums';

@Injectable()
export class PaymentService {
  private _paymentResult = signal<PaymentResponse | null>(null);
  private _isLoading = signal(false);
  
  readonly paymentResult = this._paymentResult.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  
  async charge(data: ChargeDto): Promise<void> {
    this._isLoading.set(true);
    try {
      const result = await this.http.post<PaymentResponse>('/api/payment/charge', data).toPromise();
      this._paymentResult.set(result);
    } finally {
      this._isLoading.set(false);
    }
  }
}
```

### **Angular Components**
```typescript
// frontend/src/app/payment/components/payment-form.component.ts
import { signal, computed } from '@angular/core';
import { ChargeDto } from '../../../../../shared/dto';
import { BankId } from '../../../../../shared/enums';

export class PaymentFormComponent {
  readonly amount = signal<number>(0);
  readonly selectedBank = signal<BankId>(BankId.BANK_A);
  
  readonly chargeData = computed((): ChargeDto => ({
    bankId: this.selectedBank(),
    amount: this.amount(),
    currency: 'USD'
  }));
  
  processPayment() {
    this.paymentService.charge(this.chargeData());
  }
}
```

---

## 📦 **Package Management**

### **TypeScript Path Mapping**

**Backend `tsconfig.json`**:
```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  }
}
```

**Frontend `tsconfig.json`**:
```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  }
}
```

### **Clean Imports**
```typescript
// Instead of: import { ChargeDto } from '../../../shared/dto/charge.dto';
import { ChargeDto } from '@shared/dto/charge.dto';
```

---

## 🎯 **Benefits in Practice**

### **Type Safety**
- ✅ Same interfaces everywhere
- ✅ Compile-time error detection
- ✅ Refactoring safety

### **Maintainability**
- ✅ Single source of truth
- ✅ No interface duplication
- ✅ Easy to add new fields

### **Developer Experience**
- ✅ Auto-completion works perfectly
- ✅ IDE shows interface documentation
- ✅ Clear API contracts

---

## 📝 **Best Practices**

1. **Keep shared interfaces pure** (no framework-specific code)
2. **Use TypeScript path mapping** for clean imports
3. **Version shared interfaces** if multiple projects use them
4. **Document shared interfaces** with JSDoc comments
5. **Use enums** for consistent string constants
6. **Separate DTOs from business logic** interfaces
7. **Store mocks in backend only** - Implementation details, not contracts
8. **Frontend should only know unified API** - Never bank-specific response formats

## 🎭 **Mock Strategy**

**Important Architectural Decision:**
- **Bank-specific mocks** are stored in `backend/src/payment/mocks/`
- **Frontend mocks** (if needed) only simulate our unified `PaymentResponse`
- **Shared directory** contains only contracts, not implementation details
- This maintains proper separation of concerns and realistic architecture

This approach ensures our payment gateway has rock-solid type safety across the entire stack while maintaining clean architectural boundaries! 🚀 