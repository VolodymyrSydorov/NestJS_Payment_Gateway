import { Injectable } from '@nestjs/common';
import { PaymentRequest } from '@nestjs-payment-gateway/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * PayPal SOAP Response Interface
 * Simulates PayPal's DoDirectPayment SOAP response structure
 */
export interface PayPalSoapResponse {
  transactionId: string;
  ack: 'Success' | 'Failure' | 'Warning';
  amount: string;
  currencyCode: string;
  timestamp: string;
  correlationId: string;
  errorCode?: string;
  errorMessage?: string;
  paymentStatus: 'Completed' | 'Failed' | 'Pending';
  paymentType: 'instant' | 'echeck';
  protectionEligibility: 'Eligible' | 'Ineligible';
}

/**
 * PayPal Mock Service
 * Simulates PayPal SOAP API responses with realistic XML data and behavior
 */
@Injectable()
export class PayPalMockService {

  /**
   * Generate a mock PayPal SOAP XML response
   */
  generateSoapResponse(payload: PaymentRequest, isSuccess: boolean): string {
    const response = this.generatePayPalResponse(payload, isSuccess);
    return this.buildSoapXml(response);
  }

  /**
   * Generate PayPal response data
   */
  private generatePayPalResponse(payload: PaymentRequest, isSuccess: boolean): PayPalSoapResponse {
    const transactionId = `PP${Date.now()}${this.generateRandomDigits(4)}`;
    const correlationId = this.generateRandomId(13);
    const timestamp = new Date().toISOString();

    if (isSuccess) {
      return {
        transactionId,
        ack: 'Success',
        amount: (payload.amount / 100).toFixed(2), // PayPal uses dollars, not cents
        currencyCode: payload.currency,
        timestamp,
        correlationId,
        paymentStatus: 'Completed',
        paymentType: 'instant',
        protectionEligibility: 'Eligible'
      };
    } else {
      // Failed payment response
      const failureReasons = [
        { code: '10004', message: 'Invalid payment amount.' },
        { code: '10005', message: 'Payment method declined.' },
        { code: '10009', message: 'The account is not verified.' },
        { code: '10413', message: 'The merchant does not accept payments in this currency.' },
        { code: '11607', message: 'A successful transaction has already been completed for this token.' }
      ];
      
      const failure = failureReasons[Math.floor(Math.random() * failureReasons.length)];

      return {
        transactionId,
        ack: 'Failure',
        amount: (payload.amount / 100).toFixed(2),
        currencyCode: payload.currency,
        timestamp,
        correlationId,
        errorCode: failure.code,
        errorMessage: failure.message,
        paymentStatus: 'Failed',
        paymentType: 'instant',
        protectionEligibility: 'Ineligible'
      };
    }
  }

  /**
   * Build complete SOAP XML envelope
   */
  private buildSoapXml(response: PayPalSoapResponse): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <DoDirectPaymentResponse xmlns="urn:ebay:api:PayPalAPI">
      <Timestamp>${response.timestamp}</Timestamp>
      <Ack>${response.ack}</Ack>
      <CorrelationID>${response.correlationId}</CorrelationID>
      <Version>124.0</Version>
      <Build>18316154</Build>
      ${response.ack === 'Success' ? this.buildSuccessBody(response) : this.buildFailureBody(response)}
    </DoDirectPaymentResponse>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Build success response body
   */
  private buildSuccessBody(response: PayPalSoapResponse): string {
    return `<DoDirectPaymentResponseDetails>
        <TransactionID>${response.transactionId}</TransactionID>
        <Amount currencyID="${response.currencyCode}">${response.amount}</Amount>
        <PaymentStatus>${response.paymentStatus}</PaymentStatus>
        <PaymentType>${response.paymentType}</PaymentType>
        <ProtectionEligibility>${response.protectionEligibility}</ProtectionEligibility>
      </DoDirectPaymentResponseDetails>`;
  }

  /**
   * Build failure response body
   */
  private buildFailureBody(response: PayPalSoapResponse): string {
    return `<Errors>
        <ShortMessage>Transaction failed</ShortMessage>
        <LongMessage>${response.errorMessage}</LongMessage>
        <ErrorCode>${response.errorCode}</ErrorCode>
        <SeverityCode>Error</SeverityCode>
      </Errors>
      <DoDirectPaymentResponseDetails>
        <TransactionID>${response.transactionId}</TransactionID>
        <Amount currencyID="${response.currencyCode}">${response.amount}</Amount>
        <PaymentStatus>${response.paymentStatus}</PaymentStatus>
      </DoDirectPaymentResponseDetails>`;
  }

  /**
   * Parse SOAP XML response back to object (for processor use)
   */
  parseSoapResponse(soapXml: string): PayPalSoapResponse {
    // Simple XML parsing (in real app, use xml2js library)
    const ack = this.extractXmlValue(soapXml, 'Ack');
    const transactionId = this.extractXmlValue(soapXml, 'TransactionID');
    const timestamp = this.extractXmlValue(soapXml, 'Timestamp');
    const correlationId = this.extractXmlValue(soapXml, 'CorrelationID');
    const paymentStatus = this.extractXmlValue(soapXml, 'PaymentStatus');
    const errorCode = this.extractXmlValue(soapXml, 'ErrorCode');
    const errorMessage = this.extractXmlValue(soapXml, 'LongMessage');
    
    // Extract amount and currency from amount tag with currencyID attribute
    const amountMatch = soapXml.match(/<Amount currencyID="([^"]+)">([^<]+)<\/Amount>/);
    const amount = amountMatch ? amountMatch[2] : '0.00';
    const currencyCode = amountMatch ? amountMatch[1] : 'USD';

    return {
      transactionId,
      ack: ack as 'Success' | 'Failure' | 'Warning',
      amount,
      currencyCode,
      timestamp,
      correlationId,
      errorCode: errorCode || undefined,
      errorMessage: errorMessage || undefined,
      paymentStatus: paymentStatus as 'Completed' | 'Failed' | 'Pending',
      paymentType: 'instant',
      protectionEligibility: ack === 'Success' ? 'Eligible' : 'Ineligible'
    };
  }

  /**
   * Simple XML value extraction
   */
  private extractXmlValue(xml: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}>([^<]+)<\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : '';
  }

  /**
   * Generate random alphanumeric ID using UUID (for correlation IDs)
   */
  private generateRandomId(length: number): string {
    return uuidv4().replace(/-/g, '').substring(0, length).toUpperCase();
  }

  /**
   * Generate random digits using UUID (for transaction IDs)
   */
  private generateRandomDigits(length: number): string {
    return uuidv4().replace(/[^0-9]/g, '').substring(0, length).padEnd(length, '0');
  }
} 