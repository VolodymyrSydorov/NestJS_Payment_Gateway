import { Test, TestingModule } from '@nestjs/testing';
import { PayPalProcessor } from '../processors/paypal.processor';
import { PayPalMockService } from '../mocks/paypal-mock.service';
import { PaymentRequest, BankId, Currency, PaymentStatus } from '@nestjs-payment-gateway/shared';

describe('PayPalProcessor', () => {
  let processor: PayPalProcessor;
  let mockService: PayPalMockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayPalProcessor,
        PayPalMockService,
      ],
    }).compile();

    processor = module.get<PayPalProcessor>(PayPalProcessor);
    mockService = module.get<PayPalMockService>(PayPalMockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Processor Configuration', () => {
    it('should be defined', () => {
      expect(processor).toBeDefined();
      expect(mockService).toBeDefined();
    });

    it('should have correct bank ID', () => {
      expect(processor.bankId).toBe(BankId.PAYPAL);
    });

    it('should have correct display name', () => {
      expect(processor.getDisplayName()).toBe('PayPal');
    });

    it('should be enabled by default', () => {
      expect(processor.config.enabled).toBe(true);
    });

    it('should have PayPal-specific configuration', () => {
      expect(processor.config.timeoutMs).toBe(10000); // PayPal is slower
      expect(processor.config.config?.username).toBe('paypal_api_username');
      expect(processor.config.config?.password).toBe('paypal_api_password');
      expect(processor.config.config?.signature).toBe('paypal_api_signature');
    });
  });

  describe('canProcess()', () => {
    it('should return true for PayPal payments', () => {
      const payment: PaymentRequest = {
        bankId: BankId.PAYPAL,
        amount: 1000,
        currency: Currency.USD,
      };

      expect(processor.canProcess(payment)).toBe(true);
    });

    it('should return false for non-PayPal payments', () => {
      const payment: PaymentRequest = {
        bankId: BankId.STRIPE,
        amount: 1000,
        currency: Currency.USD,
      };

      expect(processor.canProcess(payment)).toBe(false);
    });
  });

  describe('charge()', () => {
    const validPayment: PaymentRequest = {
      bankId: BankId.PAYPAL,
      amount: 2500, // $25.00
      currency: Currency.USD,
      description: 'Test PayPal payment',
      customerDetails: {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
      referenceId: 'PAYPAL_TEST_001',
    };

    it('should process successful payment with SOAP response', async () => {
      // Mock successful SOAP XML response
      const mockSoapXml = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <DoDirectPaymentResponse xmlns="urn:ebay:api:PayPalAPI">
      <Timestamp>2023-12-01T10:30:45Z</Timestamp>
      <Ack>Success</Ack>
      <CorrelationID>ABC123DEF456G</CorrelationID>
      <Version>124.0</Version>
      <Build>18316154</Build>
      <DoDirectPaymentResponseDetails>
        <TransactionID>PP17014567891234</TransactionID>
        <Amount currencyID="USD">25.00</Amount>
        <PaymentStatus>Completed</PaymentStatus>
        <PaymentType>instant</PaymentType>
        <ProtectionEligibility>Eligible</ProtectionEligibility>
      </DoDirectPaymentResponseDetails>
    </DoDirectPaymentResponse>
  </soap:Body>
</soap:Envelope>`;

      jest.spyOn(mockService, 'generateSoapResponse').mockReturnValue(mockSoapXml);

      const result = await processor.charge(validPayment);

      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(result.amount).toBe(2500);
      expect(result.currency).toBe(Currency.USD);
      expect(result.bankId).toBe(BankId.PAYPAL);
      expect(result.transactionId).toMatch(/^TXN_/);
      expect(result.bankSpecificData).toBeDefined();
      expect(result.bankSpecificData?.originalTransactionId).toBe('PP17014567891234');
      expect(result.bankSpecificData?.paymentStatus).toBe('Completed');
      expect(result.bankSpecificData?.correlationId).toBe('ABC123DEF456G');
      expect(result.bankSpecificData?.protectionEligibility).toBe('Eligible');
      expect(result.bankSpecificData?.soapResponse).toContain('soap:Envelope');
    });

    it('should process failed payment with SOAP error response', async () => {
      // Mock failed SOAP XML response
      const mockSoapXml = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <DoDirectPaymentResponse xmlns="urn:ebay:api:PayPalAPI">
      <Timestamp>2023-12-01T10:30:45Z</Timestamp>
      <Ack>Failure</Ack>
      <CorrelationID>XYZ789ABC123D</CorrelationID>
      <Version>124.0</Version>
      <Build>18316154</Build>
      <Errors>
        <ShortMessage>Transaction failed</ShortMessage>
        <LongMessage>Payment method declined.</LongMessage>
        <ErrorCode>10005</ErrorCode>
        <SeverityCode>Error</SeverityCode>
      </Errors>
      <DoDirectPaymentResponseDetails>
        <TransactionID>PP17014567891235</TransactionID>
        <Amount currencyID="USD">25.00</Amount>
        <PaymentStatus>Failed</PaymentStatus>
      </DoDirectPaymentResponseDetails>
    </DoDirectPaymentResponse>
  </soap:Body>
</soap:Envelope>`;

      jest.spyOn(mockService, 'generateSoapResponse').mockReturnValue(mockSoapXml);

      const result = await processor.charge(validPayment);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorMessage).toBe('Payment method declined.');
      expect(result.errorCode).toBe('10005');
      expect(result.amount).toBe(2500);
      expect(result.currency).toBe(Currency.USD);
      expect(result.bankId).toBe(BankId.PAYPAL);
    });

    it('should include PayPal-specific processing time', async () => {
      const result = await processor.charge(validPayment);
      
      expect(result.processingTimeMs).toBeDefined();
      expect(result.processingTimeMs).toBe(2000); // PayPal's simulated delay
    });

    it('should handle different currencies', async () => {
      const eurPayment: PaymentRequest = {
        ...validPayment,
        currency: Currency.EUR,
        amount: 3000 // €30.00
      };

      const result = await processor.charge(eurPayment);
      expect(result.currency).toBe(Currency.EUR);
    });

    it('should preserve reference ID', async () => {
      const result = await processor.charge(validPayment);
      expect(result.referenceId).toBe('PAYPAL_TEST_001');
    });
  });

  describe('SOAP XML Processing', () => {
    it('should generate and parse SOAP XML correctly', () => {
      const testPayment: PaymentRequest = {
        bankId: BankId.PAYPAL,
        amount: 1500,
        currency: Currency.USD,
      };

      // Generate SOAP XML
      const soapXml = mockService.generateSoapResponse(testPayment, true);
      
      // Verify XML structure
      expect(soapXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(soapXml).toContain('soap:Envelope');
      expect(soapXml).toContain('DoDirectPaymentResponse');
      expect(soapXml).toContain('<Ack>Success</Ack>');
      expect(soapXml).toContain('currencyID="USD"');
      expect(soapXml).toContain('15.00'); // Amount in dollars

      // Parse it back
      const parsed = mockService.parseSoapResponse(soapXml);
      expect(parsed.ack).toBe('Success');
      expect(parsed.amount).toBe('15.00');
      expect(parsed.currencyCode).toBe('USD');
      expect(parsed.paymentStatus).toBe('Completed');
    });

    it('should handle SOAP error XML correctly', () => {
      const testPayment: PaymentRequest = {
        bankId: BankId.PAYPAL,
        amount: 1500,
        currency: Currency.USD,
      };

      // Generate error SOAP XML
      const soapXml = mockService.generateSoapResponse(testPayment, false);
      
      // Verify error XML structure
      expect(soapXml).toContain('<Ack>Failure</Ack>');
      expect(soapXml).toContain('<Errors>');
      expect(soapXml).toContain('<ErrorCode>');
      expect(soapXml).toContain('<LongMessage>');

      // Parse error response
      const parsed = mockService.parseSoapResponse(soapXml);
      expect(parsed.ack).toBe('Failure');
      expect(parsed.errorCode).toBeDefined();
      expect(parsed.errorMessage).toBeDefined();
      expect(parsed.paymentStatus).toBe('Failed');
    });
  });

  describe('Network Simulation', () => {
    it('should simulate realistic PayPal processing delay', async () => {
      const startTime = Date.now();
      await processor.charge({
        bankId: BankId.PAYPAL,
        amount: 1000,
        currency: Currency.USD,
      });
      const endTime = Date.now();

      // Should take at least 2000ms (PayPal's simulated delay)
      expect(endTime - startTime).toBeGreaterThanOrEqual(1900); // Allow small margin
    });
  });
}); 