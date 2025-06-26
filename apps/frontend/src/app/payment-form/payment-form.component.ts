import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BankId, Currency } from '../../../../../shared';
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
  template: `
    <mat-card class="payment-form-card">
      <mat-card-header>
        <mat-card-title>Payment Gateway</mat-card-title>
        <mat-card-subtitle>Process payment through multiple banks</mat-card-subtitle>
      </mat-card-header>
      
      <mat-card-content>
        <form class="payment-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Amount</mat-label>
            <input 
              matInput 
              type="number" 
              [ngModel]="formData().amount"
              (ngModelChange)="updateAmount($event)"
              name="amount"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              [disabled]="loading()">
            <span matTextPrefix>$&nbsp;</span>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Currency</mat-label>
            <mat-select [ngModel]="formData().currency" (ngModelChange)="updateCurrency($event)" name="currency" [disabled]="loading()">
              <mat-option value="USD">USD - US Dollar</mat-option>
              <mat-option value="EUR">EUR - Euro</mat-option>
              <mat-option value="GBP">GBP - British Pound</mat-option>
              <mat-option value="UAH">UAH - Ukrainian Hryvnia</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Payment Processor</mat-label>
            <mat-select [ngModel]="formData().selectedBank" (ngModelChange)="updateBank($event)" name="bank" [disabled]="loading()">
              <mat-option [value]="BankId.STRIPE">Stripe (REST API)</mat-option>
              <mat-option [value]="BankId.PAYPAL">PayPal (SOAP)</mat-option>
              <mat-option [value]="BankId.SQUARE">Square (Custom)</mat-option>
              <mat-option [value]="BankId.ADYEN">Adyen (HMAC)</mat-option>
              <mat-option [value]="BankId.BRAINTREE">Braintree (GraphQL)</mat-option>
            </mat-select>
          </mat-form-field>

          <button 
            mat-raised-button 
            color="primary" 
            class="submit-button"
            [disabled]="!isFormValid() || loading()"
            (click)="onSubmit()">
            @if (loading()) {
              <mat-spinner diameter="20" color="accent"></mat-spinner>
              Processing...
            } @else {
              Process Payment
            }
          </button>
        </form>

        @if (result()) {
          <div class="result-card" [class.success]="result()?.status === 'success'" [class.error]="result()?.status !== 'success'">
            <h3>Payment Result</h3>
            <p><strong>Status:</strong> {{ result()?.status }}</p>
            <p><strong>Transaction ID:</strong> {{ result()?.transactionId }}</p>
            <p><strong>Amount:</strong> {{ amountDisplay() }}</p>
            <p><strong>Processor:</strong> {{ result()?.bankId }}</p>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .payment-form-card {
      max-width: 500px;
      margin: 20px auto;
    }
    
    .payment-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .full-width {
      width: 100%;
    }
    
    .submit-button {
      margin-top: 16px;
      height: 48px;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .result-card {
      margin-top: 24px;
      padding: 16px;
      border-radius: 8px;
      border: 2px solid;
    }

    .result-card.success {
      border-color: #4caf50;
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .result-card.error {
      border-color: #f44336;
      background-color: #ffeaea;
      color: #c62828;
    }

    .result-card h3 {
      margin: 0 0 12px 0;
      font-size: 18px;
    }

    .result-card p {
      margin: 4px 0;
    }
  `]
})
export class PaymentFormComponent {
  private paymentService = inject(PaymentService);
  private snackBar = inject(MatSnackBar);

  // Expose enums to template
  readonly BankId = BankId;
  readonly Currency = Currency;

  // All form data as signals
  formData = signal({
    amount: 100,
    currency: Currency.USD,
    selectedBank: BankId.STRIPE
  });
  
  loading = signal<boolean>(false);
  result = signal<any>(null);
  
  // Computed signals (no template function calls!)
  isFormValid = computed(() => {
    const data = this.formData();
    return data.amount > 0 && data.selectedBank !== null;
  });

  amountDisplay = computed(() => {
    const data = this.formData();
    return `$${data.amount} ${data.currency}`;
  });

  // Signal update methods
  updateAmount(amount: number) {
    this.formData.update(data => ({ ...data, amount }));
  }

  updateCurrency(currency: Currency) {
    this.formData.update(data => ({ ...data, currency }));
  }

  updateBank(selectedBank: BankId) {
    this.formData.update(data => ({ ...data, selectedBank }));
  }
  
  onSubmit() {
    if (!this.isFormValid() || this.loading()) return;

    this.loading.set(true);
    this.result.set(null);

    const data = this.formData();
    const paymentRequest = {
      amount: data.amount * 100,
      currency: data.currency,
      bankId: data.selectedBank
    };

    this.paymentService.processPayment(paymentRequest).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.result.set(response);
        this.snackBar.open('Payment processed successfully!', 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Payment error:', error);
        this.snackBar.open('Payment failed. Please try again.', 'Close', {
          duration: 5000
        });
      }
    });
  }
} 