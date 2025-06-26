"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationUtils = void 0;
exports.validatePaymentRequest = validatePaymentRequest;
const bank_id_enum_1 = require("../enums/bank-id.enum");
const currency_enum_1 = require("../enums/currency.enum");
class ValidationUtils {
    static validatePaymentRequest(paymentRequest) {
        const errors = [];
        if (!paymentRequest.bankId) {
            errors.push({
                field: 'bankId',
                message: 'Bank ID is required',
                code: 'BANK_ID_REQUIRED'
            });
        }
        else if (!Object.values(bank_id_enum_1.BankId).includes(paymentRequest.bankId)) {
            errors.push({
                field: 'bankId',
                message: 'Invalid bank ID',
                code: 'INVALID_BANK_ID'
            });
        }
        if (!paymentRequest.amount) {
            errors.push({
                field: 'amount',
                message: 'Amount is required',
                code: 'AMOUNT_REQUIRED'
            });
        }
        else if (paymentRequest.amount <= 0) {
            errors.push({
                field: 'amount',
                message: 'Amount must be greater than 0',
                code: 'INVALID_AMOUNT'
            });
        }
        else if (paymentRequest.amount > 999999999) {
            errors.push({
                field: 'amount',
                message: 'Amount exceeds maximum limit',
                code: 'AMOUNT_TOO_LARGE'
            });
        }
        if (!paymentRequest.currency) {
            errors.push({
                field: 'currency',
                message: 'Currency is required',
                code: 'CURRENCY_REQUIRED'
            });
        }
        else if (!Object.values(currency_enum_1.Currency).includes(paymentRequest.currency)) {
            errors.push({
                field: 'currency',
                message: 'Invalid currency',
                code: 'INVALID_CURRENCY'
            });
        }
        if (paymentRequest.customerDetails?.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(paymentRequest.customerDetails.email)) {
                errors.push({
                    field: 'customerDetails.email',
                    message: 'Invalid email format',
                    code: 'INVALID_EMAIL'
                });
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    static formatAmount(amount, currency) {
        const displayAmount = amount / 100;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(displayAmount);
    }
    static toSmallestUnit(displayAmount) {
        return Math.round(displayAmount * 100);
    }
}
exports.ValidationUtils = ValidationUtils;
function validatePaymentRequest(paymentRequest) {
    return ValidationUtils.validatePaymentRequest(paymentRequest);
}
//# sourceMappingURL=validation.utils.js.map