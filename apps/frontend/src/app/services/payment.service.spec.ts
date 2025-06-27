import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { PaymentService } from './payment.service';
import { PaymentRequest, PaymentResponse, BankId, Currency, PaymentStatus } from '@nestjs-payment-gateway/shared';

describe('PaymentService', () => {
  let service: PaymentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideZonelessChangeDetection()
      ]
    });
    service = TestBed.inject(PaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should process payment with specific bank via charge endpoint', () => {
    const mockRequest: PaymentRequest = {
      amount: 100,
      currency: Currency.USD,
      bankId: BankId.STRIPE
    };

    const mockResponse: PaymentResponse = {
      transactionId: 'test-123',
      status: PaymentStatus.SUCCESS,
      amount: 100,
      currency: Currency.USD,
      bankId: BankId.STRIPE,
      timestamp: new Date(),
      processingTimeMs: 250
    };

    service.processPayment(mockRequest).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    // Should call the charge endpoint
    const req = httpMock.expectOne('http://localhost:3000/payments/charge');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockRequest);
    req.flush(mockResponse);
  });

  it('should handle different payment processors', () => {
    const mockRequest: PaymentRequest = {
      amount: 200,
      currency: Currency.EUR,
      bankId: BankId.PAYPAL
    };

    const mockResponse: PaymentResponse = {
      transactionId: 'paypal-456',
      status: PaymentStatus.SUCCESS,
      amount: 200,
      currency: Currency.EUR,
      bankId: BankId.PAYPAL,
      timestamp: new Date(),
      processingTimeMs: 300
    };

    service.processPayment(mockRequest).subscribe(response => {
      expect(response.bankId).toEqual(BankId.PAYPAL);
      expect(response.status).toEqual(PaymentStatus.SUCCESS);
    });

    const req = httpMock.expectOne('http://localhost:3000/payments/charge');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });
}); 