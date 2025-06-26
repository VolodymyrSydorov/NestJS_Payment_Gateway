/**
 * Bank ID Enum
 * Defines all supported banks in the payment gateway
 */
export enum BankId {
  STRIPE = 'stripe',           // REST JSON API
  PAYPAL = 'paypal',           // SOAP/XML API  
  SQUARE = 'square',           // Custom JSON with special headers
  ADYEN = 'adyen',             // Custom authentication flow
  BRAINTREE = 'braintree'      // GraphQL API
}

/**
 * Bank Display Names for UI
 */
export const BANK_DISPLAY_NAMES: Record<BankId, string> = {
  [BankId.STRIPE]: 'Stripe',
  [BankId.PAYPAL]: 'PayPal',
  [BankId.SQUARE]: 'Square',
  [BankId.ADYEN]: 'Adyen',
  [BankId.BRAINTREE]: 'Braintree'
}; 