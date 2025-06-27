# Payment Gateway Frontend (Angular)

## 🚀 **Quick Start**

### Prerequisites
- Node.js 18+
- npm

### Setup & Development
```bash
# Install dependencies
npm install

# Start development server (Port 4200)
npm start

# Production build
npm run build
```

## 🧪 **Testing**
```bash
# Run unit tests
npm run test

# Watch mode for development
npm run test:watch

# End-to-end tests
npm run e2e
```

## 📋 **Project Structure**

```
src/
├── app/
│   ├── app.ts                    # Root component
│   ├── app.config.ts             # App configuration
│   ├── payment-form/             # Payment form component
│   │   ├── payment-form.component.ts    # Component logic
│   │   ├── payment-form.component.html  # Template
│   │   └── payment-form.component.scss  # Styles
│   └── services/
│       └── payment.service.ts    # API service
├── index.html                    # Main HTML
└── main.ts                       # Bootstrap
```

## ✅ **Current Features**

- **Angular 17**: Modern standalone components
- **Angular Signals**: Reactive state management  
- **Material Design**: Clean, responsive UI
- **Real-time Validation**: Form validation with computed signals
- **5 Payment Processors**: Stripe, PayPal, Square, Adyen, Braintree
- **UUID Accessibility**: Dynamic component IDs
- **Error Handling**: User-friendly error messages
- **Type Safety**: Shared DTOs with backend

## 🔌 **Backend Integration**

```typescript
// Payment API calls
POST http://localhost:3000/payments     # Process payment
GET http://localhost:3000/api/info      # API information
```

## 💻 **Development**

```bash
# Development server with hot reload
npm start

# Code quality checks
npm run lint
npm run lint:fix
```

## 🏗️ **Technical Implementation**

### Angular Signals Architecture
```typescript
// Reactive state management
formData = signal<PaymentFormData>({ amount: 100, currency: Currency.USD });
formErrors = computed(() => validateForm(this.formData()));
isLoading = signal<boolean>(false);
```

### UUID Accessibility
```typescript
// Dynamic component IDs prevent conflicts
private readonly componentId = uuidv4().substring(0, 8);
readonly ids = {
  amountInput: `amount-input-${this.componentId}`,
  currencySelect: `currency-select-${this.componentId}`
};
```

### Memory Management
```typescript
// Automatic subscription cleanup
this.paymentService.processPayment(request)
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe(response => {});
```

## 📊 **Quality Standards**

- ✅ **Zero 'any' types**: Full TypeScript coverage
- ✅ **Component separation**: Logic/Template/Styles separated
- ✅ **Modern Angular**: 17+ syntax with @if/@for
- ✅ **Performance**: No template function calls
- ✅ **Accessibility**: Dynamic UUID-based IDs
