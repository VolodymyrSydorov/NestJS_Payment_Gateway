# Development Guidelines & Best Practices

## 🛠️ **Development Workflow**

### **Project Setup & Build Order**
1. **Shared Package First**: Always build shared package before backend/frontend
   ```bash
   cd shared && npm run build
   ```
2. **Backend Development**: 
   ```bash
   cd apps/backend && npm run start:dev
   ```
3. **Frontend Development**:
   ```bash
   cd apps/frontend && npm start
   ```

### **File Organization Principles**
- **Backend**: Feature-based modules (`payment/`, `config/`, `interfaces/`)
- **Frontend**: Component-based structure with separated concerns
- **Shared**: Domain-driven organization (`dto/`, `enums/`, `interfaces/`, `utils/`)
- **Configuration**: Centralized in `apps/backend/src/config/`
- **Types**: Centralized in `apps/backend/src/interfaces/`

## 🎯 **Code Quality Guidelines**

### **Backend Development Rules**

#### **1. Configuration Management**
- **ALWAYS** use centralized configuration from `processor-config.ts`
- **NEVER** use magic numbers - use named constants
- **Example**:
  ```typescript
  // ❌ BAD
  await this.delay(200);
  
  // ✅ GOOD  
  await this.delay(getProcessingTime(bankId));
  ```

#### **2. Type Safety**
- **NEVER** use `any` type - use proper interfaces
- **ALWAYS** define return types for public methods
- **Example**:
  ```typescript
  // ❌ BAD
  getProcessorInfo(): any {
  
  // ✅ GOOD
  getProcessorInfo(): ProcessorInfo {
  ```

#### **3. Logging Standards**
- **NEVER** use `console.log` - use NestJS Logger
- **ALWAYS** log important operations and errors
- **Example**:
  ```typescript
  // ❌ BAD
  console.log('Payment processed');
  
  // ✅ GOOD
  this.logger.log(`Payment processed for ${bankId}: ${transactionId}`);
  ```

#### **4. Error Handling**
- **ALWAYS** use proper HTTP exceptions
- **NEVER** expose sensitive information in error messages
- **Example**:
  ```typescript
  // ❌ BAD
  throw new Error('Database connection failed: localhost:5432');
  
  // ✅ GOOD
  throw new BadRequestException('Payment processing failed');
  ```

#### **5. Currency Usage**
- **ALWAYS** use `Currency` enum instead of strings
- **ENSURE** consistency between frontend and backend
- **Example**:
  ```typescript
  // ❌ BAD
  supportedCurrencies: ['USD', 'EUR'];
  
  // ✅ GOOD
  supportedCurrencies: [Currency.USD, Currency.EUR];
  ```

### **Frontend Development Rules**

#### **1. Angular Signals Architecture**
- **ALWAYS** use signals for reactive state management
- **NEVER** call functions in templates - use computed signals
- **Example**:
  ```typescript
  // ❌ BAD - Template function
  getCurrencySymbol(currency: string) { return symbols[currency]; }
  
  // ✅ GOOD - Computed signal
  currencySymbol = computed(() => this.getCurrencySymbol(this.formData().currency));
  ```

#### **2. Component ID Management**
- **ALWAYS** use UUID-based dynamic IDs for accessibility
- **NEVER** hardcode element IDs
- **Example**:
  ```typescript
  // ❌ BAD
  <input id="amount-input">
  
  // ✅ GOOD
  <input [id]="ids.amountInput">
  // Where ids.amountInput = `amount-input-${uuidv4().substring(0, 8)}`
  ```

#### **3. Memory Management**
- **ALWAYS** use `takeUntilDestroyed` for subscriptions
- **NEVER** manually manage subscription cleanup in modern Angular
- **Example**:
  ```typescript
  // ✅ GOOD
  this.paymentService.processPayment(request)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(response => {});
  ```

#### **4. Modern Angular Syntax**
- **ALWAYS** use Angular 17+ control flow (`@if`, `@for`)
- **NEVER** use legacy structural directives in new code
- **Example**:
  ```html
  <!-- ❌ BAD -->
  <div *ngIf="showError">{{ error }}</div>
  
  <!-- ✅ GOOD -->
  @if (showError) { <div>{{ error }}</div> }
  ```

### **Shared Package Development Rules**

#### **1. Build System**
- **ALWAYS** compile TypeScript to `dist/` directory
- **ENSURE** `package.json` points to compiled files
- **Example package.json**:
  ```json
  {
    "main": "dist/index.js",
    "types": "dist/index.d.ts"
  }
  ```

#### **2. Interface Design**
- **ALWAYS** use descriptive interface names
- **ENSURE** all interfaces are exported from index files
- **Example**:
  ```typescript
  // ✅ GOOD - Descriptive naming
  export interface ProcessorInfo {
    name: string;
    status: 'active' | 'inactive';
    features: string[];
  }
  ```

## ⚠️ **Common Pitfalls to Avoid**

### **Backend Pitfalls**
1. **Magic Numbers**: Hardcoded timeouts, delays, or limits
2. **Console Logging**: Using console.log instead of NestJS Logger
3. **Any Types**: Losing type safety with 'any'
4. **Hardcoded URLs**: Not using centralized mock configuration
5. **Inconsistent Currency**: Mixing string literals with enum values

### **Frontend Pitfalls**
1. **Template Functions**: Functions called on every change detection
2. **Hardcoded IDs**: Fixed element IDs causing accessibility issues
3. **Memory Leaks**: Not properly cleaning up subscriptions
4. **Legacy Syntax**: Using old Angular patterns instead of modern approach

### **Shared Package Pitfalls**
1. **Wrong Entry Points**: package.json pointing to source instead of dist
2. **Missing Compilation**: Forgetting to build shared package
3. **Circular Dependencies**: Importing between modules incorrectly

## 🧪 **Testing Guidelines**

### **Backend Testing Standards**
- **ALWAYS** test both success and failure scenarios
- **USE** proper mocking for external dependencies
- **ENSURE** tests are isolated and independent
- **Example**:
  ```typescript
  it('should process payment successfully', async () => {
    const mockProcessor = { processPayment: jest.fn().mockResolvedValue(successResponse) };
    // Test implementation
  });
  ```

### **Frontend Testing Standards**
- **TEST** component behavior, not implementation details
- **MOCK** HTTP services appropriately
- **VERIFY** signal state changes
- **Example**:
  ```typescript
  it('should update form data when input changes', () => {
    component.formData.set({ amount: 100, currency: Currency.USD });
    expect(component.formData().amount).toBe(100);
  });
  ```

## 📝 **Code Review Checklist**

### **Before Submitting Code**
- [ ] All tests passing (122/122 for backend)
- [ ] No console.log statements
- [ ] No 'any' types in new code
- [ ] Proper error handling implemented
- [ ] Configuration centralized (no magic numbers)
- [ ] Currency enum used consistently
- [ ] UUID-based IDs for frontend components
- [ ] Memory management proper (takeUntilDestroyed)
- [ ] Modern Angular syntax used
- [ ] Shared package builds successfully

### **During Code Review**
- [ ] Code follows established patterns
- [ ] Interfaces properly defined
- [ ] Error handling comprehensive
- [ ] Performance considerations addressed
- [ ] Security best practices followed
- [ ] Documentation updated if needed

## 🚀 **Performance Considerations**

### **Backend Performance**
- **Use** centralized configuration to avoid repeated calculations
- **Implement** proper async/await patterns
- **Avoid** blocking operations in request handlers
- **Cache** frequently accessed configuration

### **Frontend Performance**
- **Use** computed signals for derived state
- **Avoid** function calls in templates
- **Implement** proper change detection optimization
- **Use** OnPush change detection where appropriate

### **Build Performance**
- **Keep** shared package compilation fast
- **Use** proper TypeScript configuration
- **Minimize** bundle size with tree shaking
- **Optimize** import statements

This development guide ensures consistent, high-quality code across the entire payment gateway application while maintaining the professional standards achieved through comprehensive refactoring.
