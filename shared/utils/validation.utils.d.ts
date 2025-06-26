import { PaymentRequest } from '../dto/charge.dto';
import { Currency } from '../enums/currency.enum';
export interface ValidationError {
    field: string;
    message: string;
    code: string;
}
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}
export declare class ValidationUtils {
    static validatePaymentRequest(paymentRequest: PaymentRequest): ValidationResult;
    static formatAmount(amount: number, currency: Currency): string;
    static toSmallestUnit(displayAmount: number): number;
}
export declare function validatePaymentRequest(paymentRequest: PaymentRequest): ValidationResult;
