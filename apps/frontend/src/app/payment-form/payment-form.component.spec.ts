import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideZonelessChangeDetection } from '@angular/core';
import { PaymentFormComponent } from './payment-form.component';

describe('PaymentFormComponent', () => {
  let component: PaymentFormComponent;
  let fixture: ComponentFixture<PaymentFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PaymentFormComponent,
        NoopAnimationsModule // Disable animations for testing
      ],
      providers: [
        provideZonelessChangeDetection() // Use zoneless change detection in tests
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have form invalid initially', () => {
    expect(component.isFormValid()).toBeFalsy();
  });

  it('should validate form when amount and bank are set', () => {
    component.amount.set(100);
    component.selectedBank.set('stripe' as any);
    
    expect(component.isFormValid()).toBeTruthy();
  });
}); 