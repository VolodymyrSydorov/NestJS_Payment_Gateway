import { Component, signal, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BankId, Currency, CURRENCY_SYMBOLS, PaymentResponse } from '@shared';
import { PaymentService } from '../services/payment.service';
import { v4 as uuidv4 } from 'uuid';

interface ValidationErrors {
  amount?: string;
  currency?: string;
  selectedBank?: string;
}

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './payment-form.component.html',
  styleUrls: ['./payment-form.component.scss']
})
export class PaymentFormComponent {
  private paymentService = inject(PaymentService);
  private snackBar = inject(MatSnackBar);
  private takeUntilDestroyed = takeUntilDestroyed();

  // Validation constants
  private readonly MIN_AMOUNT = 0.01;
  private readonly MAX_AMOUNT = 50000;

  // Unique IDs for accessibility (generated once per component instance)
  private readonly componentId = uuidv4().substring(0, 8);
  readonly ids = {
    paymentTitle: `payment-title-${this.componentId}`,
    amountInput: `amount-input-${this.componentId}`,
    amountError: `amount-error-${this.componentId}`,
    currencySelect: `currency-select-${this.componentId}`,
    currencyError: `currency-error-${this.componentId}`,
    bankSelect: `bank-select-${this.componentId}`,
    bankError: `bank-error-${this.componentId}`,
    resultTitle: `result-title-${this.componentId}`
  };

  // Expose enums to template
  readonly BankId = BankId;
  readonly Currency = Currency;

  // Arrays for ngFor iterations
  readonly currencies = [
    { value: Currency.USD, label: 'USD - US Dollar' },
    { value: Currency.EUR, label: 'EUR - Euro' },
    { value: Currency.GBP, label: 'GBP - British Pound' },
    { value: Currency.UAH, label: 'UAH - Ukrainian Hryvnia' }
  ];

  readonly paymentProcessors = [
    { value: BankId.STRIPE, label: 'Stripe (REST API)' },
    { value: BankId.PAYPAL, label: 'PayPal (SOAP)' },
    { value: BankId.SQUARE, label: 'Square (Custom)' },
    { value: BankId.ADYEN, label: 'Adyen (HMAC)' },
    { value: BankId.BRAINTREE, label: 'Braintree (GraphQL)' }
  ];

  // All form data as signals
  formData = signal({
    amount: 100,
    currency: Currency.USD,
    selectedBank: BankId.STRIPE
  });
  
  isLoading = signal<boolean>(false);
  paymentResult = signal<PaymentResponse | null>(null);
  
  // Form validation with computed signals
  formErrors = computed<ValidationErrors>(() => {
    const formData = this.formData();
    const errors: ValidationErrors = {};

    // Amount validation
    if (!formData.amount || formData.amount <= 0) {
      errors.amount = 'Amount is required and must be positive';
    } else if (formData.amount < this.MIN_AMOUNT) {
      errors.amount = `Minimum amount is ${this.getCurrencySymbol(formData.currency)}${this.MIN_AMOUNT}`;
    } else if (formData.amount > this.MAX_AMOUNT) {
      errors.amount = `Maximum amount is ${this.getCurrencySymbol(formData.currency)}${this.MAX_AMOUNT.toLocaleString()}`;
    }

    // Currency validation
    if (!formData.currency) {
      errors.currency = 'Please select a currency';
    }

    // Payment processor validation
    if (!formData.selectedBank) {
      errors.selectedBank = 'Please select a payment processor';
    }

    return errors;
  });

  // Check if form has critical errors (prevent submission)
  hasCriticalErrors = computed(() => {
    const formData = this.formData();
    // Only prevent submission for truly critical issues
    return !formData.currency || !formData.selectedBank || formData.amount <= 0;
  });

  // Check if form is valid (for validation display)
  isFormValid = computed(() => {
    const errors = this.formErrors();
    return Object.keys(errors).length === 0;
  });

  // Display formatted amount
  amountDisplay = computed(() => {
    const formData = this.formData();
    return `${this.getCurrencySymbol(formData.currency)}${formData.amount} ${formData.currency}`;
  });

  // Helper method for currency symbols
  getCurrencySymbol(currency: Currency): string {
    return CURRENCY_SYMBOLS[currency];
  }

  // Signal update methods
  updateAmount(amount: number | string) {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
    this.formData.update(formData => ({ ...formData, amount: numericAmount }));
  }

  updateCurrency(currency: Currency) {
    this.formData.update(formData => ({ ...formData, currency }));
  }

  updateBank(selectedBank: BankId) {
    this.formData.update(formData => ({ ...formData, selectedBank }));
  }

  // Get specific error message for API errors
  private getErrorMessage(error: any): string {
    if (error.error?.message) {
      return error.error.message;
    }
    
    if (error.status === 400) {
      return 'Invalid payment data. Please check your input.';
    } else if (error.status === 402) {
      return 'Payment declined. Please try a different payment method.';
    } else if (error.status === 500) {
      return 'Payment processor temporarily unavailable. Please try again.';
    } else if (error.status === 0) {
      return 'Unable to connect to payment service. Check your internet connection.';
    }
    
    return 'Payment failed. Please try again.';
  }
  
  onSubmit() {
    if (this.hasCriticalErrors() || this.isLoading()) return;

    this.isLoading.set(true);
    this.paymentResult.set(null);

    const formData = this.formData();
    const paymentRequest = {
      amount: formData.amount * 100, // Convert to cents
      currency: formData.currency,
      bankId: formData.selectedBank
    };

    this.paymentService.processPayment(paymentRequest)
      .pipe(this.takeUntilDestroyed)
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.paymentResult.set(response as PaymentResponse);
          this.snackBar.open('Payment processed successfully!', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          this.isLoading.set(false);
          const errorMessage = this.getErrorMessage(error);
          console.error('Payment error:', error);
          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000
          });
        }
      });
  }
} 