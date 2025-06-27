/**
 * Currency Enum
 * Defines only the currencies actually supported and used by the payment gateway
 * Based on consistent support across all payment processors
 */
export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  AUD = 'AUD',
  CAD = 'CAD'
}

/**
 * Currency symbols for UI display
 */
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  [Currency.USD]: '$',
  [Currency.EUR]: '€',
  [Currency.GBP]: '£',
  [Currency.JPY]: '¥',
  [Currency.AUD]: 'A$',
  [Currency.CAD]: 'C$'
};

/**
 * Currency display names for user interfaces
 */
export const CURRENCY_NAMES: Record<Currency, string> = {
  [Currency.USD]: 'US Dollar',
  [Currency.EUR]: 'Euro',
  [Currency.GBP]: 'British Pound',
  [Currency.JPY]: 'Japanese Yen',
  [Currency.AUD]: 'Australian Dollar',
  [Currency.CAD]: 'Canadian Dollar'
}; 