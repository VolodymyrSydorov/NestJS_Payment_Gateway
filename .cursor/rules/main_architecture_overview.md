# NestJS Payment Gateway - Main Architecture Overview

## 🏗️ **System Architecture**

This is a full-stack payment gateway application with a clean, modular architecture supporting 5 different payment processors through a unified API interface.

### **Technology Stack**
- **Backend**: NestJS + TypeScript (Port 3000)
- **Frontend**: Angular 17 + Material Design + Signals (Port 4200)  
- **Shared**: Centralized TypeScript DTOs/enums/interfaces
- **Testing**: Jest (122/122 backend tests passing)
- **Build**: TypeScript compilation with proper module resolution

### **Deployment Architecture**
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Frontend (4200)   │───▶│   Backend (3000)    │───▶│  Payment Processors │
│  Angular + Signals  │    │  NestJS + Factory   │    │  Stripe, PayPal,    │
│  Material Design    │    │  Pattern            │    │  Square, Adyen,     │
│  UUID Accessibility │    │  CORS Enabled       │    │  Braintree          │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
            │                         │
            └─────────┬─────────────────┘
                      ▼
            ┌─────────────────────┐
            │   Shared Package    │
            │  DTOs, Enums,       │
            │  Interfaces         │
            └─────────────────────┘
```

## 📦 **Main Building Blocks**

### **1. Backend Core (`apps/backend/src/`)**

#### **Entry Point & Configuration**
- **`main.ts`**: Application bootstrap with CORS and professional logging
- **`app.module.ts`**: Root module orchestration
- **`app.controller.ts`**: API metadata endpoints (`/api/info`)
- **`app.service.ts`**: API information service

#### **Configuration Layer (`apps/backend/src/config/`)**
- **`processor-config.ts`**: Centralized timing, features, and currency configuration
- **`mocks.ts`**: Mock URLs, API keys, and test data for development

#### **Type Safety Layer (`apps/backend/src/interfaces/`)**
- **`processor-types.ts`**: Strong TypeScript interfaces (ProcessorInfo, ProcessorError, etc.)

#### **Payment Processing Module (`apps/backend/src/payment/`)**

**Core Components:**
- **`payment.module.ts`**: Dependency injection and processor registration
- **`payment.controller.ts`**: REST API endpoints (`/payments`, `/payments/health`)
- **`payment.service.ts`**: Business logic orchestration

**Factory Pattern Implementation:**
- **`factories/payment-processor.factory.ts`**: Dynamic processor instantiation

**Processor Implementations (`processors/`):**
- **`base-payment.processor.ts`**: Abstract base class with common functionality
- **`stripe.processor.ts`**: Stripe REST API integration
- **`paypal.processor.ts`**: PayPal SOAP/XML integration  
- **`square.processor.ts`**: Square custom headers integration
- **`adyen.processor.ts`**: Adyen HMAC authentication integration
- **`braintree.processor.ts`**: Braintree GraphQL integration

**Mock Services (`mocks/`):**
- **Individual mock services**: `*-mock.service.ts` for each processor
- **Realistic simulation**: Response times, error scenarios, transaction IDs

**Testing (`__tests__/`):**
- **Comprehensive test suite**: 122 tests covering all processors and scenarios
- **Integration tests**: End-to-end payment flow validation
- **Unit tests**: Individual processor and service testing

### **2. Frontend Core (`apps/frontend/src/`)**

#### **Application Shell**
- **`app.ts`**: Root component with routing
- **`app.config.ts`**: Angular 17+ configuration
- **`app.routes.ts`**: Route definitions

#### **Payment Components (`app/payment-form/`)**
- **`payment-form.component.ts`**: Smart component with signals and validation
- **`payment-form.component.html`**: Clean template with @if/@for control flow
- **`payment-form.component.scss`**: Material Design styling
- **UUID Accessibility**: Dynamic component IDs prevent conflicts

#### **Services (`app/services/`)**
- **`payment.service.ts`**: HTTP client for backend API communication
- **Error handling**: Status-specific error messages
- **Type safety**: PaymentResponse interfaces

### **3. Shared Package (`shared/`)**

#### **Data Transfer Objects (`dto/`)**
- **`charge.dto.ts`**: Payment request structure
- **`payment-response.dto.ts`**: Unified response format

#### **Enumerations (`enums/`)**
- **`bank-id.enum.ts`**: Payment processor identifiers
- **`currency.enum.ts`**: Supported currencies (USD, EUR, GBP, JPY, AUD, CAD)
- **`payment-status.enum.ts`**: Transaction status values

#### **Interfaces (`interfaces/`)**
- **`payment-processor.interface.ts`**: Processor contract definition
- **`payment-processor-factory.interface.ts`**: Factory pattern interface

#### **Utilities (`utils/`)**
- **`validation.utils.ts`**: Common validation functions

#### **Build System**
- **`package.json`**: Proper main/types entry points to `dist/`
- **`tsconfig.json`**: Compilation configuration
- **TypeScript compilation**: Source → `dist/` for consumption

## 🎯 **Design Patterns & Principles**

### **1. Factory Pattern**
**Location**: `apps/backend/src/payment/factories/`
**Purpose**: Dynamic processor instantiation based on `BankId`
```typescript
// Runtime processor selection
const processor = this.factory.createProcessor(request.bankId);
const result = await processor.processPayment(request);
```

### **2. Strategy Pattern**  
**Location**: `apps/backend/src/payment/processors/`
**Purpose**: Interchangeable payment processing algorithms
- Each processor implements `IPaymentProcessor` interface
- Uniform API despite different underlying protocols (REST, SOAP, GraphQL)

### **3. Dependency Injection**
**Framework**: NestJS IoC Container
**Benefits**: Testability, modularity, loose coupling
- Services injected via constructor
- Easy mocking for unit tests

### **4. Repository Pattern (Implicit)**
**Location**: Mock services simulate external APIs
**Purpose**: Abstraction layer for external payment services
- Mock implementations for development/testing
- Real implementations would connect to actual payment APIs

### **5. Observer Pattern (Frontend)**
**Framework**: Angular Signals
**Purpose**: Reactive state management
```typescript
// Reactive form state
formData = signal<PaymentFormData>({ /* initial */ });
formErrors = computed(() => validateForm(this.formData()));
```

## 🔄 **Data Flow Architecture**

### **Payment Processing Flow**
1. **Frontend**: User submits payment form
2. **Validation**: Client-side validation with real-time feedback
3. **HTTP Request**: Angular service calls backend API
4. **Controller**: NestJS controller receives request
5. **Service**: Business logic validation and processing
6. **Factory**: Dynamically creates appropriate processor
7. **Processor**: Handles payment provider-specific logic
8. **Response**: Unified response format back to frontend
9. **UI Update**: Angular signals update reactive UI

### **Configuration Flow**
1. **Centralized Config**: `processor-config.ts` defines all constants
2. **Runtime Access**: Processors use `getProcessingTime()`, `getTimeout()`
3. **Mock Data**: Development uses `mocks.ts` configuration
4. **Type Safety**: All config accessed through typed interfaces

### **Error Handling Flow**
1. **Processor Level**: Specific error handling per payment provider
2. **Service Level**: Business logic validation and error transformation  
3. **Controller Level**: HTTP status code mapping
4. **Frontend Level**: User-friendly error messages based on status codes

## 🧪 **Testing Architecture**

### **Backend Testing (122/122 passing)**
- **Unit Tests**: Individual processor testing with mocks
- **Integration Tests**: End-to-end payment flow validation
- **Service Tests**: Business logic validation
- **Controller Tests**: HTTP endpoint testing

### **Frontend Testing**
- **Component Tests**: Payment form validation and behavior
- **Service Tests**: HTTP client and error handling
- **Signal Tests**: Reactive state management validation

## 🔐 **Security Architecture**

### **ID Generation**
- **UUID v4**: Cryptographically secure transaction IDs
- **No Math.random()**: Eliminated predictable ID generation
- **Format**: `failed_${timestamp}_${uuid}`

### **Input Validation**
- **Frontend**: Real-time form validation with limits ($0.01-$50,000)
- **Backend**: DTO validation with class-validator
- **Type Safety**: TypeScript prevents common errors

### **Error Handling**
- **No sensitive data exposure**: Generic error messages to frontend
- **Detailed logging**: Server-side logging for debugging
- **Status codes**: Proper HTTP status mapping

## 📊 **Performance Architecture**

### **Frontend Optimization**
- **Angular Signals**: Efficient reactive updates
- **Computed Values**: Automatic memoization
- **No Template Functions**: Eliminated change detection overhead
- **Memory Management**: `takeUntilDestroyed` prevents leaks

### **Backend Optimization**
- **Centralized Config**: Reduced duplication and overhead
- **Proper Async**: Non-blocking payment processing
- **Efficient Testing**: Fast test execution with proper mocking

### **Build Optimization**
- **Clean Compilation**: Proper TypeScript output structure
- **Tree Shaking**: Unused code elimination
- **Module Resolution**: Efficient import/export structure

This architecture provides a robust, maintainable, and scalable foundation for payment processing with professional-grade code quality and zero technical debt. 