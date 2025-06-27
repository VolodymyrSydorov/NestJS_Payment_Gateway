import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaymentRequest, PaymentResponse } from '@nestjs-payment-gateway/shared';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000'; // Backend URL

  /**
   * Process payment with specific bank
   * Calls the backend charge endpoint
   */
  processPayment(request: PaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.baseUrl}/payments/charge`, request);
  }

  /**
   * Process payment with automatic bank selection
   */
  processPaymentAuto(request: Omit<PaymentRequest, 'bankId'>): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.baseUrl}/payments/auto`, request);
  }

  /**
   * Get health status of all payment processors
   */
  getHealthStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/payments/health`);
  }
} 