# Payment Gateway Backend (NestJS)

## 🚀 **Quick Start**

### Prerequisites
- Node.js 18+
- npm

### Setup & Development
```bash
# Install dependencies
npm install

# Start development server (Port 3000)
npm run start:dev

# Production build & start
npm run build
npm run start:prod
```

## 🧪 **Testing**
```bash
# Run all tests (122/122 passing)
npm run test

# Watch mode for development
npm run test:watch

# Test coverage report
npm run test:cov
```

## 📋 **Project Structure**

```
src/
├── config/              # Centralized configuration
│   ├── processor-config.ts   # Timing, features, currencies
│   └── mocks.ts              # Mock URLs and test data
├── interfaces/          # Type safety interfaces
│   └── processor-types.ts    # ProcessorInfo, etc.
├── payment/             # Payment processing module
│   ├── processors/      # 5 payment processors
│   ├── factories/       # Factory pattern implementation
│   ├── mocks/          # Mock services for testing
│   └── __tests__/      # Comprehensive test suite
├── app.controller.ts    # API metadata endpoints
├── app.service.ts       # API information service
└── main.ts             # Bootstrap with CORS & logging
```

## 🏦 **Payment Processors**

- **Stripe** - REST JSON API (200ms)
- **PayPal** - SOAP/XML format (2000ms)  
- **Square** - Custom JSON headers (500ms)
- **Adyen** - HMAC authentication (300ms)
- **Braintree** - GraphQL API (400ms)

## 🔌 **API Endpoints**

```bash
# Payment processing
POST /payments           # Process payment
GET /payments/health     # Health check
GET /payments/processors # List processors

# API information
GET /api/info           # API metadata
```

## 💻 **Development**

```bash
# Development with hot reload
npm run start:dev

# Debug mode
npm run start:debug

# Check for issues
npm run test
```

## 🏗️ **Architecture**

- **Factory Pattern**: Dynamic processor selection
- **Dependency Injection**: NestJS IoC container
- **Mock Services**: Realistic payment simulation
- **Centralized Config**: No magic numbers
- **Strong Typing**: Zero 'any' types
- **Professional Logging**: NestJS Logger
