# Architectural Decisions for Payment Gateway

## 🎯 **Key Design Decisions Made**

### **1. Shared Interfaces Strategy** ✅

**Decision**: Use shared TypeScript interfaces between frontend and backend
**Location**: `shared/` directory in project root
**Rationale**: 
- Type safety across the entire stack
- Single source of truth for data contracts
- Refactoring safety and better developer experience

**What's Shared**:
- DTOs (ChargeDto, PaymentResponse)
- Interfaces (PaymentProcessor, BankConfig)
- Enums (BankId, PaymentStatus, Currency)
- Validation utilities

**What's NOT Shared**:
- Implementation details
- Mock data (bank-specific)
- Framework-specific code

---

### **2. Mock Data Storage Strategy** ✅

**Decision**: Store bank-specific mocks in backend only (not shared)
**Location**: `backend/src/payment/mocks/`
**Rationale**:
- Mocks are implementation details, not contracts
- Frontend should only know unified API format
- Maintains proper separation of concerns
- More realistic architecture for production

**Structure**:
```
backend/src/payment/mocks/
├── stripe-mock.service.ts     # Simulates Stripe API responses
├── paypal-mock.service.ts     # Simulates SOAP XML responses
├── square-mock.service.ts     # Simulates Square JSON responses
├── adyen-mock.service.ts      # Simulates HMAC auth responses
├── braintree-mock.service.ts  # Simulates GraphQL responses
└── mock.factory.ts            # Creates appropriate mock service
```

---

### **3. Real Bank Names Usage** ✅

**Decision**: Use actual payment provider names instead of generic Bank A/B/C
**Banks Selected**:
- **Stripe** - REST JSON API (most common)
- **PayPal** - SOAP/XML API (legacy but widespread)
- **Square** - Custom headers (modern but specific requirements)
- **Adyen** - HMAC authentication (enterprise security)
- **Braintree** - GraphQL API (modern alternative format)

**Rationale**: More realistic and educational than generic names

---

### **4. Protocol Simulation Strategy** ✅

**Decision**: Simulate different protocols with realistic mock responses
**Approach**:
- Each bank processor simulates its real protocol complexity
- Real transformation logic converts to unified format
- Simulated network delays and error rates per bank
- Realistic response formats (JSON, XML, GraphQL)

**Benefits**:
- Learn real architectural patterns
- No external API dependencies
- Focus on core architecture concepts
- Easy migration to real APIs later

---

### **5. TypeScript Path Mapping** ✅

**Decision**: Use `@shared/*` path mapping in both FE and BE
**Configuration**:
- Backend: `tsconfig.json` with `"@shared/*": ["../shared/*"]`
- Frontend: `tsconfig.app.json` with same mapping
**Benefits**: Clean imports, better developer experience

---

### **6. Currency and Amount Handling** ✅

**Decision**: Store amounts in smallest currency unit (cents)
**Rationale**: 
- Avoids floating-point arithmetic issues
- Standard practice in payment systems
- Consistent across all processors

**Supported Currencies**:
- USD, EUR, GBP, UAH with proper symbols

---

## 🏗️ **Architecture Patterns Used**

### **1. Adapter Pattern**
- Each bank processor adapts different APIs to unified interface
- `PaymentProcessor` interface implemented by all processors

### **2. Factory Pattern**
- `PaymentProcessorFactory` creates appropriate processor for each bank
- `MockServiceFactory` creates appropriate mock service

### **3. Strategy Pattern**
- Different payment strategies for different banks
- Interchangeable at runtime based on `BankId`

### **4. Dependency Injection**
- NestJS DI container manages processor instances
- Mock services injected into processors

---

## 🎯 **Benefits Achieved**

1. **Type Safety** - Same interfaces everywhere, compile-time error detection
2. **Clean Architecture** - Proper separation of concerns
3. **Scalability** - Easy to add new banks or modify existing ones
4. **Testability** - Each component can be tested independently
5. **Developer Experience** - Perfect auto-completion and documentation
6. **Learning Focus** - Understand real patterns without API complexity
7. **Production Ready** - Easy migration path to real APIs

---

## 🚀 **Next Steps**

With these architectural decisions in place, we're ready to implement:

1. **Phase 2.2**: Backend payment module with mock services
2. **Phase 3**: Bank processor implementations
3. **Phase 4**: Angular frontend with Material Design + Signals

The foundation is solid and all major architectural decisions are documented! 🎯 