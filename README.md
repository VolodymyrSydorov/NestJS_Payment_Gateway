# NestJS + Angular Payment Gateway

A full-stack payment gateway application built with NestJS backend and Angular frontend, integrating with 5 different banks through a unified API interface.

## 🏗️ **Architecture**

- **Backend**: NestJS with TypeScript (Port 3000)
- **Frontend**: Angular with Material Design + Signals (Port 4200)  
- **Pattern**: Factory pattern for multi-bank integration
- **State Management**: Angular Signals for reactive UI

## 🚀 **Quick Start**

### Prerequisites
- Node.js 18+ 
- npm

### Backend Setup
```bash
cd backend
npm install
npm run start:dev
```

### Frontend Setup  
```bash
cd frontend
npm install
npm start
```

## 📋 **Project Structure**

```
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── payment/        # Payment processing module
│   │   │   ├── processors/ # Bank-specific processors
│   │   │   ├── dto/        # Data transfer objects  
│   │   │   ├── interfaces/ # TypeScript interfaces
│   │   │   └── factories/  # Processor factory
│   │   └── app.module.ts
│   └── package.json
├── frontend/               # Angular SPA
│   ├── src/
│   │   ├── app/
│   │   │   └── payment/   # Payment UI components
│   │   └── styles.scss
│   └── package.json
└── .cursor/
    └── rules/             # Implementation plans & docs
```

## 🏦 **Supported Banks**

1. **Bank A** - REST API with JSON
2. **Bank B** - SOAP/XML format  
3. **Bank C** - Custom JSON structure
4. **Bank D** - Custom headers/auth
5. **Bank E** - GraphQL-based API

## 🎯 **Features**

### Backend
- ✅ Unified `ProcessingService.charge()` method
- ✅ Factory pattern for dynamic bank selection
- ✅ Standardized request/response DTOs
- ✅ Error handling and validation

### Frontend  
- ✅ Material Design components
- ✅ Angular Signals for state management
- ✅ Reactive payment form
- ✅ Real-time processing indicators
- ✅ Bank selection and result display

## 🔌 **API Endpoints**

```
POST /api/payment/charge
{
  "bankId": "bank_a",
  "amount": 100.50,
  "currency": "USD"
}
```

**Response:**
```json
{
  "transactionId": "txn_abcd1234",
  "status": "success",
  "amount": 100.50,
  "currency": "USD", 
  "timestamp": "2025-01-26T19:20:00.000Z"
}
```

## 🛠️ **Development**

### Backend Commands
```bash
npm run start:dev    # Development mode
npm run build        # Production build
npm run test         # Run tests
```

### Frontend Commands  
```bash
npm start           # Development server
npm run build       # Production build
npm run test        # Run tests
```

## 📚 **Documentation**

- [Step-by-step Implementation Plan](.cursor/rules/step_by_step_plan.md)
- [Angular Signals Architecture](.cursor/rules/angular_signals_architecture.md)
- [Original Implementation Plan](.cursor/rules/implementation_plan.md)

## 🎯 **Implementation Status**

- [x] **Phase 1**: Basic NestJS + Angular setup
- [x] **Phase 1**: Angular Material integration  
- [x] **Phase 1**: Project structure & documentation
- [ ] **Phase 2**: Payment module architecture
- [ ] **Phase 3**: Bank processors implementation
- [ ] **Phase 4**: Angular UI components

## 🤝 **Contributing**

1. Follow the implementation plan in `.cursor/rules/`
2. Use Angular Signals for frontend state management
3. Maintain the factory pattern for bank processors
4. Keep the unified API interface

## 📄 **License**

MIT License 