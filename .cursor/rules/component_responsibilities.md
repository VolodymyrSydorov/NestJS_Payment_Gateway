# Component Responsibilities & Coding Standards

## 🎯 **Component Ownership & Responsibilities**

### **Backend Components**

#### **Entry Layer**
- **`apps/backend/src/main.ts`**
  - **Responsibility**: Application bootstrap, CORS configuration, global pipes
  - **Dependencies**: NestJS core, Logger
  - **Standards**: Professional logging, graceful error handling

- **`apps/backend/src/app.module.ts`**  
  - **Responsibility**: Root module, global providers, imports orchestration
  - **Dependencies**: PaymentModule, ConfigModule
  - **Standards**: Clean module structure, proper dependency injection

#### **API Layer**
- **`apps/backend/src/app.controller.ts`**
  - **Responsibility**: API metadata endpoints (`/api/info`)
  - **HTTP Methods**: GET only (informational)
  - **Response**: JSON with supported processors and currencies
  - **Standards**: RESTful design, descriptive endpoint naming

- **`apps/backend/src/app.service.ts`**
  - **Responsibility**: API information aggregation
  - **Dependencies**: Shared enums (Currency, BankId)
  - **Standards**: Pure functions, no side effects

#### **Configuration Layer**
- **`apps/backend/src/config/processor-config.ts`**
  - **Responsibility**: Centralized timing, timeout, and feature configuration
  - **Constants**: `PROCESSOR_TIMEOUTS`, `PROCESSOR_FEATURES`, `DEFAULT_SUPPORTED_CURRENCIES`
  - **Helper Functions**: `getProcessingTime()`, `getTimeout()`
  - **Standards**: Immutable constants, typed interfaces, no magic numbers

- **`apps/backend/src/config/mocks.ts`**
  - **Responsibility**: Mock URLs, API keys, test data for development
  - **Constants**: `MOCK_URLS`, `MOCK_API_KEYS`, `MOCK_TEST_DATA`
  - **Standards**: Clear separation from real configuration, descriptive naming

#### **Type Safety Layer**
- **`apps/backend/src/interfaces/processor-types.ts`**
  - **Responsibility**: Strong TypeScript interfaces for payment processing
  - **Interfaces**: `ProcessorInfo`, `ProcessorError`, `ProcessorHealthStatus`
  - **Standards**: Comprehensive type coverage, no 'any' types

#### **Payment Processing Core**
- **`apps/backend/src/payment/payment.module.ts`**
  - **Responsibility**: Payment module configuration, processor registration
  - **Providers**: PaymentService, PaymentProcessorFactory, all processors
  - **Dependencies**: NestJS Logger for professional logging
  - **Standards**: Dependency injection, modular architecture

- **`apps/backend/src/payment/payment.controller.ts`**
  - **Responsibility**: REST API endpoints for payment processing
  - **Endpoints**: 
    - `POST /payments` - Process payment
    - `GET /payments/health` - Health check
    - `GET /payments/processors` - List processors
  - **Standards**: HTTP status codes, proper error handling, validation

- **`apps/backend/src/payment/payment.service.ts`**
  - **Responsibility**: Business logic orchestration, processor management
  - **Methods**: `processPayment()`, `getProcessorInfo()`, `enableProcessor()`, `disableProcessor()`
  - **Dependencies**: PaymentProcessorFactory, Logger
  - **Standards**: Single responsibility, proper async/await, error transformation

#### **Factory Pattern Implementation**
- **`apps/backend/src/payment/factories/payment-processor.factory.ts`**
  - **Responsibility**: Dynamic processor instantiation based on BankId
  - **Method**: `createProcessor(bankId: BankId): IPaymentProcessor`
  - **Standards**: Type safety, proper error handling for unknown processors

#### **Payment Processor Implementations**
- **`apps/backend/src/payment/processors/base-payment.processor.ts`**
  - **Responsibility**: Abstract base class with common functionality
  - **Methods**: `abstract processPayment()`, `validateRequest()`, `createResponse()`
  - **Standards**: Template method pattern, shared validation logic

- **Individual Processors** (`stripe.processor.ts`, `paypal.processor.ts`, etc.)
  - **Responsibility**: Provider-specific payment processing
  - **Interface**: Implements `IPaymentProcessor`
  - **Dependencies**: Provider-specific mock services, configuration
  - **Standards**: 
    - Consistent error handling
    - UUID-based transaction IDs
    - Centralized timeout configuration
    - Realistic processing times

## 🎯 **Coding Standards & Conventions**

### **TypeScript Standards**
- **No 'any' types**: All components use strong typing
- **Interface-driven design**: Clear contracts between components
- **Proper async/await**: No callback hell or promise chains
- **Immutable data**: Use of `as const` and readonly properties

### **NestJS Backend Standards**
- **Dependency Injection**: Constructor injection for all dependencies
- **Module organization**: Feature-based module structure
- **Error handling**: Proper HTTP exception throwing
- **Logging**: NestJS Logger instead of console.log
- **Validation**: DTO validation with class-validator
- **Testing**: Comprehensive test coverage (122/122 passing)

### **Angular Frontend Standards**
- **Signals architecture**: Reactive state management
- **Modern syntax**: Angular 17+ @if/@for control flow
- **Component separation**: Logic, template, styles in separate files
- **Memory management**: takeUntilDestroyed for subscription cleanup
- **Accessibility**: Dynamic UUID-based IDs, semantic HTML
- **Material Design**: Consistent UI component usage

### **Security Standards**
- **UUID generation**: Cryptographically secure IDs
- **Input validation**: Client and server-side validation
- **Error sanitization**: No sensitive data in error messages
- **CORS configuration**: Proper cross-origin setup

This component responsibility matrix ensures clear ownership, maintainability, and consistent coding practices across the entire payment gateway application.
