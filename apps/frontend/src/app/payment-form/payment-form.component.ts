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
import { BankId, Currency, CURRENCY_SYMBOLS } from '@shared';
import { PaymentService } from '../services/payment.service';

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
  paymentResult = signal<any>(null);
  
  // Computed signals (no template function calls!)
  isFormValid = computed(() => {
    const formData = this.formData();
    return formData.amount > 0 && formData.selectedBank !== null;
  });

  amountDisplay = computed(() => {
    const formData = this.formData();
    return `${this.getCurrencySymbol(formData.currency)}${formData.amount} ${formData.currency}`;
  });

  // Helper method for currency symbols
  getCurrencySymbol(currency: Currency): string {
    return CURRENCY_SYMBOLS[currency];
  }

  // Signal update methods
  updateAmount(amount: number) {
    this.formData.update(formData => ({ ...formData, amount }));
  }

  updateCurrency(currency: Currency) {
    this.formData.update(formData => ({ ...formData, currency }));
  }

  updateBank(selectedBank: BankId) {
    this.formData.update(formData => ({ ...formData, selectedBank }));
  }
  
  onSubmit() {
    if (!this.isFormValid() || this.isLoading()) return;

    this.isLoading.set(true);
    this.paymentResult.set(null);

    const formData = this.formData();
    const paymentRequest = {
      amount: formData.amount * 100,
      currency: formData.currency,
      bankId: formData.selectedBank
    };

    this.paymentService.processPayment(paymentRequest)
      .pipe(this.takeUntilDestroyed)
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.paymentResult.set(response);
          this.snackBar.open('Payment processed successfully!', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          this.isLoading.set(false);
          console.error('Payment error:', error);
          this.snackBar.open('Payment failed. Please try again.', 'Close', {
            duration: 5000
          });
        }
      });
  }
} 