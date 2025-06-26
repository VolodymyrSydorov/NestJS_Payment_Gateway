/**
 * Currency Enum
 * Defines all supported currencies in the payment gateway
 */
export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  UAH = 'UAH'
}

/**
 * Currency symbols for UI display
 */
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  [Currency.USD]: '$',
  [Currency.EUR]: '€',
  [Currency.GBP]: '£',
  [Currency.UAH]: '₴'
}; 