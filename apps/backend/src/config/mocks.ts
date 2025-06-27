/**
 * Mock Configuration
 * Centralizes all mock URLs, API keys, and test data used across payment processors
 */

/**
 * Mock service URLs and domains for testing/development
 */
export const MOCK_URLS = {
  company: 'https://your-company.com',
  returnUrl: 'https://your-company.com/checkout/return',
  stripe: 'https://api.stripe.com/v1',
  paypal: 'https://api.paypal.com',
  square: 'https://connect.squareup.com/v2',
  adyen: 'https://checkout-test.adyen.com/v71',
  braintree: 'https://api.sandbox.braintreegateway.com'
} as const;

/**
 * Mock API keys for development/testing
 */
export const MOCK_API_KEYS = {
  stripe: 'sk_test_mock_key',
  square: 'sandbox-sq0idp-mock_access_token',
  adyen: 'AQE1hmfuXNWTK0Qc+iSS3VlbmY1mFGfXV2RKzeVL-mock-api-key',
  braintree: 'test_braintree_api_key_mock'
} as const;

/**
 * Mock test data and identifiers
 */
export const MOCK_TEST_DATA = {
  square: {
    locationId: 'LH2B1Q6V7GNPG'
  },
  adyen: {
    merchantAccount: 'YourCompanyECOM'
  },
  braintree: {
    merchantId: 'test_merchant_id'
  }
} as const; 