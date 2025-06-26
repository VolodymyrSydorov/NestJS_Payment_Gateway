# Angular Signals Architecture for Payment Gateway

## 🎯 **Overview**
Using Angular Signals for reactive state management throughout the payment gateway frontend. Signals provide a more efficient and declarative way to handle state changes and UI updates.

---

## 🔧 **Signal-Based Architecture**

### **Payment Service Signals**
```typescript
@Injectable()
export class PaymentService {
  // State signals
  private _isLoading = signal(false);
  private _paymentResult = signal<PaymentResponse | null>(null);
  private _error = signal<string | null>(null);
  private _selectedBank = signal<string>('');

  // Read-only computed signals
  readonly isLoading = this._isLoading.asReadonly();
  readonly paymentResult = this._paymentResult.asReadonly();
  readonly error = this._error.asReadonly();
  readonly selectedBank = this._selectedBank.asReadonly();

  // Computed signals
  readonly canSubmit = computed(() => 
    !this.isLoading() && this.selectedBank() !== ''
  );
}
```

### **Component Signals**
```typescript
export class PaymentFormComponent {
  // Form signals
  readonly amount = signal<number>(0);
  readonly currency = signal<string>('USD');
  readonly selectedBank = signal<string>('');

  // UI state signals  
  readonly isFormValid = computed(() => 
    this.amount() > 0 && this.selectedBank() !== ''
  );

  // Inject payment service
  private paymentService = inject(PaymentService);

  // Effects for reactive UI updates
  constructor() {
    effect(() => {
      if (this.paymentService.paymentResult()) {
        // Navigate to results or show success message
      }
    });
  }
}
```

---

## 🎨 **Material Components with Signals**

### **Bank Selection (MatSelect)**
```html
<mat-form-field>
  <mat-label>Select Bank</mat-label>
  <mat-select [value]="selectedBank()" 
              (selectionChange)="selectedBank.set($event.value)">
    <mat-option value="bank_a">Bank A</mat-option>
    <mat-option value="bank_b">Bank B</mat-option>
    <!-- ... -->
  </mat-select>
</mat-form-field>
```

### **Amount Input**
```html
<mat-form-field>
  <mat-label>Amount</mat-label>
  <input matInput 
         type="number" 
         [value]="amount()"
         (input)="amount.set(+$event.target.value)">
</mat-form-field>
```

### **Submit Button**
```html
<button mat-raised-button 
        color="primary"
        [disabled]="!isFormValid() || paymentService.isLoading()"
        (click)="processPayment()">
  @if (paymentService.isLoading()) {
    <mat-spinner diameter="20"></mat-spinner>
    Processing...
  } @else {
    Process Payment
  }
</button>
```

### **Progress Bar**
```html
@if (paymentService.isLoading()) {
  <mat-progress-bar mode="indeterminate"></mat-progress-bar>
}
```

---

## 🔄 **Reactive Payment Flow**

### **1. Form Submission**
```typescript
processPayment() {
  const chargeData = {
    bankId: this.selectedBank(),
    amount: this.amount(),
    currency: this.currency()
  };
  
  this.paymentService.charge(chargeData);
}
```

### **2. Service Processing**
```typescript
async charge(data: ChargeRequest) {
  this._isLoading.set(true);
  this._error.set(null);
  
  try {
    const result = await this.http.post<PaymentResponse>('/api/payment/charge', data).toPromise();
    this._paymentResult.set(result);
  } catch (error) {
    this._error.set(error.message);
  } finally {
    this._isLoading.set(false);
  }
}
```

### **3. Reactive UI Updates**
```typescript
// Component automatically reacts to signal changes
export class PaymentResultComponent {
  private paymentService = inject(PaymentService);
  
  // Template automatically updates when signals change
  readonly result = this.paymentService.paymentResult;
  readonly error = this.paymentService.error;
  readonly isLoading = this.paymentService.isLoading;
}
```

---

## 🎯 **Benefits of This Architecture**

### **Performance**
- ✅ Fine-grained reactivity (only affected parts update)
- ✅ No unnecessary change detection cycles
- ✅ Efficient DOM updates

### **Developer Experience**
- ✅ Declarative state management
- ✅ Type-safe reactive programming
- ✅ Easy debugging with signal traces

### **Maintainability**
- ✅ Clear data flow
- ✅ Predictable state updates
- ✅ Easy to test and reason about

---

## 📝 **Implementation Guidelines**

1. **Use signals for all component state**
2. **Prefer computed signals over manual calculations**
3. **Use effects for side effects (navigation, notifications)**
4. **Keep signals focused and granular**
5. **Use readonly signals for external consumption**
6. **Combine signals with Material components for reactive UI**

This architecture ensures our payment gateway frontend is modern, performant, and maintainable! 🚀 