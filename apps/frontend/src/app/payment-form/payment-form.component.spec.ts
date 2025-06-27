import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';
import { PaymentFormComponent } from './payment-form.component';
import { PaymentService } from '../services/payment.service';
import { BankId, Currency, PaymentStatus } from '@shared';

describe('PaymentFormComponent', () => {
  let component: PaymentFormComponent;
  let fixture: ComponentFixture<PaymentFormComponent>;
  let mockPaymentService: jasmine.SpyObj<PaymentService>;

  beforeEach(async () => {
    const paymentServiceSpy = jasmine.createSpyObj('PaymentService', ['processPayment']);

    await TestBed.configureTestingModule({
      imports: [
        PaymentFormComponent,
        NoopAnimationsModule
      ],
      providers: [
        provideZonelessChangeDetection(),
        { provide: PaymentService, useValue: paymentServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentFormComponent);
    component = fixture.componentInstance;
    mockPaymentService = TestBed.inject(PaymentService) as jasmine.SpyObj<PaymentService>;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      const formData = component.formData();
      expect(formData.amount).toBe(100);
      expect(formData.currency).toBe(Currency.USD);
      expect(formData.selectedBank).toBe(BankId.STRIPE);
    });

    it('should not be loading initially', () => {
      expect(component.isLoading()).toBeFalse();
    });
  });

  describe('Form Validation', () => {
    it('should be valid with default values', () => {
      expect(component.isFormValid()).toBeTrue();
    });

    it('should be invalid with zero amount', () => {
      component.updateAmount(0);
      expect(component.isFormValid()).toBeFalse();
      expect(component.formErrors().amount).toBe('Amount is required and must be positive');
    });

    it('should be invalid with negative amount', () => {
      component.updateAmount(-50);
      expect(component.isFormValid()).toBeFalse();
      expect(component.formErrors().amount).toBe('Amount is required and must be positive');
    });

    it('should be invalid with amount below minimum', () => {
      component.updateAmount(0.005);
      expect(component.isFormValid()).toBeFalse();
      expect(component.formErrors().amount).toBe('Minimum amount is $0.01');
    });

    it('should be invalid with amount above maximum', () => {
      component.updateAmount(100000);
      expect(component.isFormValid()).toBeFalse();
      expect(component.formErrors().amount).toContain('Maximum amount is $50');
    });

    it('should be valid with amount within range', () => {
      component.updateAmount(500);
      expect(component.isFormValid()).toBeTrue();
      expect(component.formErrors().amount).toBeUndefined();
    });
  });

  describe('Form Updates', () => {
    it('should update amount correctly', () => {
      component.updateAmount(250);
      expect(component.formData().amount).toBe(250);
    });

    it('should update currency correctly', () => {
      component.updateCurrency(Currency.EUR);
      expect(component.formData().currency).toBe(Currency.EUR);
    });

    it('should update bank correctly', () => {
      component.updateBank(BankId.PAYPAL);
      expect(component.formData().selectedBank).toBe(BankId.PAYPAL);
    });

    it('should handle string amount input', () => {
      component.updateAmount('150.50');
      expect(component.formData().amount).toBe(150.5);
    });

    it('should handle invalid string amount input', () => {
      component.updateAmount('invalid');
      expect(component.formData().amount).toBe(0);
    });
  });

  describe('Computed Signals', () => {
    it('should calculate amount display correctly', () => {
      component.updateAmount(100);
      component.updateCurrency(Currency.USD);
      expect(component.amountDisplay()).toBe('$100 USD');
    });

    it('should show correct currency symbol', () => {
      expect(component.getCurrencySymbol(Currency.USD)).toBe('$');
      expect(component.getCurrencySymbol(Currency.EUR)).toBe('€');
      expect(component.getCurrencySymbol(Currency.GBP)).toBe('£');
    });

    it('should detect critical errors correctly', () => {
      // Valid form
      expect(component.hasCriticalErrors()).toBeFalse();
      
      // Zero amount is critical
      component.updateAmount(0);
      expect(component.hasCriticalErrors()).toBeTrue();
    });
  });

  describe('Payment Submission', () => {
    beforeEach(() => {
      // Set valid form data
      component.updateAmount(100);
      component.updateCurrency(Currency.USD);
      component.updateBank(BankId.STRIPE);
    });

    it('should not submit when form has critical errors', () => {
      component.updateAmount(0); // Make form invalid
      component.onSubmit();
      expect(mockPaymentService.processPayment).not.toHaveBeenCalled();
    });

    it('should not submit when already loading', () => {
      component.isLoading.set(true);
      component.onSubmit();
      expect(mockPaymentService.processPayment).not.toHaveBeenCalled();
    });

    it('should submit with correct payment request', () => {
      mockPaymentService.processPayment.and.returnValue(of({
        transactionId: 'test-123',
        status: PaymentStatus.SUCCESS,
        amount: 10000,
        currency: Currency.USD,
        bankId: BankId.STRIPE,
        timestamp: new Date()
      } as any));

      component.onSubmit();

      expect(mockPaymentService.processPayment).toHaveBeenCalledWith({
        amount: 10000, // 100 * 100 (cents conversion)
        currency: Currency.USD,
        bankId: BankId.STRIPE
      });
    });

    it('should handle successful payment', () => {
      const mockResponse = {
        transactionId: 'test-123',
        status: PaymentStatus.SUCCESS,
        amount: 10000,
        currency: Currency.USD,
        bankId: BankId.STRIPE,
        timestamp: new Date()
      } as any;
      mockPaymentService.processPayment.and.returnValue(of(mockResponse));

      component.onSubmit();

      expect(component.isLoading()).toBeFalse();
      expect(component.paymentResult()).toEqual(mockResponse);
    });

    it('should handle payment errors', () => {
      const error = { status: 402, error: { message: 'Payment declined' } };
      mockPaymentService.processPayment.and.returnValue(throwError(() => error));
      
      // Spy on console.error to suppress error logs during tests
      spyOn(console, 'error');

      component.onSubmit();

      expect(component.isLoading()).toBeFalse();
      expect(component.paymentResult()).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Payment error:', error);
    });
  });

  describe('Error Messages', () => {
    it('should return specific error for 400 status', () => {
      const error = { status: 400 };
      const message = component['getErrorMessage'](error);
      expect(message).toBe('Invalid payment data. Please check your input.');
    });

    it('should return specific error for 402 status', () => {
      const error = { status: 402 };
      const message = component['getErrorMessage'](error);
      expect(message).toBe('Payment declined. Please try a different payment method.');
    });

    it('should return specific error for 500 status', () => {
      const error = { status: 500 };
      const message = component['getErrorMessage'](error);
      expect(message).toBe('Payment processor temporarily unavailable. Please try again.');
    });

    it('should return connection error for status 0', () => {
      const error = { status: 0 };
      const message = component['getErrorMessage'](error);
      expect(message).toBe('Unable to connect to payment service. Check your internet connection.');
    });

    it('should return backend error message when available', () => {
      const error = { error: { message: 'Custom backend error' } };
      const message = component['getErrorMessage'](error);
      expect(message).toBe('Custom backend error');
    });
  });
}); 