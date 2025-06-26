/**
 * Payment Status Enum
 * Defines all possible states of a payment transaction
 */
export enum PaymentStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
} 