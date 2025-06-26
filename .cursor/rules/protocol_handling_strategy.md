# Protocol Handling Strategy for Real Payment Gateway

## 🌐 **Real-World Protocol Challenges**

Different payment providers use completely different protocols, authentication methods, and data formats. Our payment gateway must abstract these differences while maintaining the specific requirements of each provider.

---

## 🏦 **Bank-Specific Protocol Implementation**

### **1. STRIPE (REST JSON API) 🟢 Simple**

**Protocol**: Standard HTTP REST with JSON
**Authentication**: Bearer token in headers
**Request Format**: Standard JSON POST

```typescript
// Real Stripe API call
class StripeProcessor implements PaymentProcessor {
  async charge(payload: ChargeDto): Promise<PaymentResponse> {
    const stripePayload = {
      amount: payload.amount, // Stripe expects cents
      currency: payload.currency.toLowerCase(),
      source: 'tok_visa', // Token from frontend
      description: payload.description
    };

    const response = await fetch('https://api.stripe.com/v1/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(stripePayload).toString()
    });

    return this.transformStripeResponse(await response.json());
  }
}
```

**Challenges**:
- Form-encoded data (not JSON!)
- Amounts in cents
- Specific error code mapping

---

### **2. PAYPAL (SOAP/XML API) 🟡 Complex**

**Protocol**: SOAP over HTTP with XML
**Authentication**: Username/Password + Signature
**Request Format**: XML SOAP envelope

```typescript
class PayPalProcessor implements PaymentProcessor {
  async charge(payload: ChargeDto): Promise<PaymentResponse> {
    const soapEnvelope = `
      <?xml version="1.0" encoding="UTF-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Header>
          <RequesterCredentials xmlns="urn:ebay:api:PayPalAPI">
            <Credentials xmlns="urn:ebay:apis:eBLBaseComponents">
              <Username>${this.config.username}</Username>
              <Password>${this.config.password}</Password>
              <Signature>${this.config.signature}</Signature>
            </Credentials>
          </RequesterCredentials>
        </soap:Header>
        <soap:Body>
          <DoDirectPaymentReq xmlns="urn:ebay:api:PayPalAPI">
            <DoDirectPaymentRequest>
              <PaymentAction>Sale</PaymentAction>
              <PaymentDetails>
                <OrderTotal currency="${payload.currency}">${payload.amount / 100}</OrderTotal>
              </PaymentDetails>
            </DoDirectPaymentRequest>
          </DoDirectPaymentReq>
        </soap:Body>
      </soap:Envelope>
    `;

    const response = await fetch(this.config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'urn:ebay:api:PayPalAPI/DoDirectPayment'
      },
      body: soapEnvelope
    });

    const xmlResponse = await response.text();
    return this.parseXMLResponse(xmlResponse);
  }

  private parseXMLResponse(xml: string): PaymentResponse {
    // Use xml2js library to parse XML response
    const parser = new xml2js.Parser();
    // Transform XML to our unified PaymentResponse
  }
}
```

**Challenges**:
- XML SOAP envelope construction
- Complex authentication (username + password + signature)
- XML parsing for responses
- Different error format

---

### **3. SQUARE (Custom JSON + Special Headers) 🟡 Medium**

**Protocol**: REST JSON with custom headers
**Authentication**: Bearer token + Application ID
**Request Format**: JSON with specific structure

```typescript
class SquareProcessor implements PaymentProcessor {
  async charge(payload: ChargeDto): Promise<PaymentResponse> {
    const squarePayload = {
      source_id: 'cnon:card-nonce-ok', // Card nonce from frontend
      amount_money: {
        amount: payload.amount, // Square expects cents
        currency: payload.currency
      },
      idempotency_key: uuidv4(), // Required for Square
      location_id: this.config.locationId // Square-specific
    };

    const response = await fetch('https://connect.squareup.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Square-Version': '2023-10-18', // API version required
        'Application-Id': this.config.applicationId, // Custom header
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(squarePayload)
    });

    return this.transformSquareResponse(await response.json());
  }
}
```

**Challenges**:
- Custom headers (Square-Version, Application-Id)
- Idempotency keys required
- Location ID concept
- Card nonce handling

---

### **4. ADYEN (Custom Authentication Flow) 🔴 Complex**

**Protocol**: REST JSON with complex auth
**Authentication**: API Key + HMAC signature + timestamp
**Request Format**: JSON with encrypted data

```typescript
class AdyenProcessor implements PaymentProcessor {
  async charge(payload: ChargeDto): Promise<PaymentResponse> {
    const timestamp = new Date().toISOString();
    const hmacSignature = this.generateHMACSignature(payload, timestamp);
    
    const adyenPayload = {
      amount: {
        value: payload.amount, // Adyen expects cents
        currency: payload.currency
      },
      reference: payload.referenceId || uuidv4(),
      merchantAccount: this.config.merchantAccount,
      paymentMethod: {
        type: 'scheme',
        encryptedCardNumber: 'encrypted_card_data', // From frontend
        encryptedExpiryMonth: 'encrypted_month',
        encryptedExpiryYear: 'encrypted_year',
        encryptedSecurityCode: 'encrypted_cvv'
      }
    };

    const response = await fetch('https://checkout-test.adyen.com/v71/payments', {
      method: 'POST',
      headers: {
        'X-API-Key': this.config.apiKey,
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp,
        'X-Signature': hmacSignature, // HMAC signature
        'Adyen-Library-Name': 'NodeJS Gateway',
        'Adyen-Library-Version': '1.0.0'
      },
      body: JSON.stringify(adyenPayload)
    });

    return this.transformAdyenResponse(await response.json());
  }

  private generateHMACSignature(payload: ChargeDto, timestamp: string): string {
    const dataToSign = `${payload.amount}${payload.currency}${timestamp}`;
    return crypto
      .createHmac('sha256', this.config.hmacKey)
      .update(dataToSign)
      .digest('hex');
  }
}
```

**Challenges**:
- HMAC signature generation
- Timestamp synchronization
- Encrypted card data handling
- Complex merchant account setup

---

### **5. BRAINTREE (GraphQL API) 🟠 Modern but Complex**

**Protocol**: GraphQL over HTTP
**Authentication**: Bearer token
**Request Format**: GraphQL mutations

```typescript
class BraintreeProcessor implements PaymentProcessor {
  async charge(payload: ChargeDto): Promise<PaymentResponse> {
    const graphqlMutation = `
      mutation ChargePaymentMethod($input: ChargePaymentMethodInput!) {
        chargePaymentMethod(input: $input) {
          transaction {
            id
            status
            amount {
              value
              currencyCode
            }
            statusHistory {
              status
              timestamp
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        paymentMethodId: 'payment_method_nonce', // From frontend
        transaction: {
          amount: (payload.amount / 100).toString(), // Braintree expects dollars
          currencyCode: payload.currency
        }
      }
    };

    const response = await fetch('https://payments.sandbox.braintree-api.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Braintree-Version': '2019-01-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: graphqlMutation,
        variables: variables
      })
    });

    return this.transformBraintreeResponse(await response.json());
  }
}
```

**Challenges**:
- GraphQL query construction
- Different amount format (dollars, not cents)
- Complex nested response structure
- Error handling in GraphQL format

---

## 🛠️ **Implementation Strategy**

### **1. Mock Data Architecture Decision**

**🎯 Mocks stored in Backend Only** (not in shared)

**Rationale:**
- Bank-specific mocks are implementation details, not contracts
- Frontend should only know about unified `PaymentResponse` format
- Maintains proper separation of concerns
- More realistic architecture for production systems

**Structure:**
```
backend/src/payment/
├── mocks/
│   ├── stripe-mock.service.ts     # Realistic Stripe API responses
│   ├── paypal-mock.service.ts     # SOAP XML mock responses
│   ├── square-mock.service.ts     # Square JSON mock responses
│   ├── adyen-mock.service.ts      # Adyen auth mock responses
│   ├── braintree-mock.service.ts  # GraphQL mock responses
│   └── mock.factory.ts            # Creates appropriate mock service
├── processors/
│   ├── stripe.processor.ts        # Uses StripeMockService
│   ├── paypal.processor.ts        # Uses PayPalMockService
│   └── ...
```

### **2. Adapter Pattern for Each Protocol**

```typescript
// Abstract base class
abstract class BasePaymentProcessor implements PaymentProcessor {
  constructor(
    protected config: BankConfig,
    protected mockService?: any // Injected mock service
  ) {}
  
  abstract charge(payload: ChargeDto): Promise<PaymentResponse>;
  
  // Common error handling
  protected handleCommonErrors(error: any): PaymentResponse {
    return {
      transactionId: uuidv4(),
      status: PaymentStatus.FAILED,
      errorMessage: this.extractErrorMessage(error),
      // ... other fields
    };
  }
  
  // Common network delay simulation
  protected async simulateNetworkDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Each bank extends the base with mock integration
class StripeProcessor extends BasePaymentProcessor {
  constructor(config: BankConfig, private stripeMock: StripeMockService) {
    super(config);
  }
}
```

### **3. Mock Services for Protocol Simulation**

```typescript
// Mock service for each bank's protocol
class StripeMockService {
  generateMockResponse(payload: ChargeDto): StripeApiResponse {
    return {
      id: `ch_${Date.now()}`,
      status: Math.random() > 0.05 ? 'succeeded' : 'failed',
      amount: payload.amount,
      currency: payload.currency.toLowerCase(),
      created: Math.floor(Date.now() / 1000)
    };
  }
}

class PayPalMockService {
  generateMockXMLResponse(payload: ChargeDto): string {
    const status = Math.random() > 0.15 ? 'Success' : 'Failure';
    return `
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <DoDirectPaymentResponse>
            <TransactionID>PP_${Date.now()}</TransactionID>
            <Ack>${status}</Ack>
            <Amount>${payload.amount / 100}</Amount>
          </DoDirectPaymentResponse>
        </soap:Body>
      </soap:Envelope>
    `;
  }
}

// Factory for creating appropriate mock service
class MockServiceFactory {
  static createForBank(bankId: BankId): any {
    switch (bankId) {
      case BankId.STRIPE: return new StripeMockService();
      case BankId.PAYPAL: return new PayPalMockService();
      case BankId.SQUARE: return new SquareMockService();
      case BankId.ADYEN: return new AdyenMockService();
      case BankId.BRAINTREE: return new BraintreeMockService();
    }
  }
}
```

### **4. Response Transformation Layer**

```typescript
// Each processor transforms its specific response to our unified format
class ResponseTransformer {
  static transformStripe(stripeResponse: any): PaymentResponse {
    return {
      transactionId: `TXN_${uuidv4()}`, // Our internal ID
      status: stripeResponse.status === 'succeeded' 
        ? PaymentStatus.SUCCESS 
        : PaymentStatus.FAILED,
      amount: stripeResponse.amount,
      currency: stripeResponse.currency.toUpperCase(),
      bankId: BankId.STRIPE,
      timestamp: new Date(stripeResponse.created * 1000),
      bankSpecificData: {
        originalTransactionId: stripeResponse.id,
        authorizationCode: stripeResponse.authorization_code
      }
    };
  }
  
  static transformPayPal(xmlResponse: string): PaymentResponse {
    // Parse XML using xml2js library
    const parsed = parseXML(xmlResponse);
    const response = parsed['soap:Envelope']['soap:Body'][0]['DoDirectPaymentResponse'][0];
    
    return {
      transactionId: `TXN_${uuidv4()}`,
      status: response.Ack[0] === 'Success' 
        ? PaymentStatus.SUCCESS 
        : PaymentStatus.FAILED,
      amount: parseFloat(response.Amount[0]) * 100, // Convert to cents
      currency: Currency.USD, // PayPal default
      bankId: BankId.PAYPAL,
      timestamp: new Date(),
      bankSpecificData: {
        originalTransactionId: response.TransactionID[0],
        ackStatus: response.Ack[0]
      }
    };
  }
}
```

---

## 📦 **Required Dependencies**

```json
{
  "dependencies": {
    "@nestjs/axios": "^3.0.0",     // HTTP requests
    "xml2js": "^0.6.2",           // XML parsing for SOAP
    "crypto": "built-in",          // HMAC signatures
    "uuid": "^9.0.0",             // Unique IDs
    "graphql": "^16.8.1",         // GraphQL support
    "form-data": "^4.0.0"         // Form encoding
  }
}
```

---

## 🎯 **Benefits of This Mock-Based Approach**

1. **Unified Interface** - All banks implement the same `PaymentProcessor` interface
2. **Protocol Simulation** - Each processor simulates its real protocol complexity
3. **Realistic Behavior** - Different timing, error rates, and response formats per bank
4. **Error Standardization** - All mock errors mapped to our standard format
5. **Testability** - Each processor can be tested with predictable mock data
6. **Maintainability** - Adding new banks doesn't affect existing ones
7. **Type Safety** - TypeScript ensures we handle all response types correctly
8. **Development Speed** - No external API dependencies or credentials needed
9. **Learning Focus** - Concentrate on architecture without real payment complexity

## 🔄 **Mock vs Real Implementation**

**Current (Mock) Architecture:**
- Mock services generate realistic bank responses
- Real transformation logic converts to unified format
- Simulated network delays and error rates
- Perfect for learning and development

**Future (Real) Architecture:**
- Replace mock services with actual HTTP clients
- Keep all transformation and processor logic unchanged
- Same unified interface for frontend
- Easy migration path from mock to production

This architecture allows us to learn real payment gateway patterns while staying focused on the core architectural concepts! 🚀 