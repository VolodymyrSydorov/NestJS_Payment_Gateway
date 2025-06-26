import { PaymentStatus } from '../enums/payment-status.enum';
import { BankId } from '../enums/bank-id.enum';
import { Currency } from '../enums/currency.enum';
export interface BankSpecificData {
    originalTransactionId?: string;
    bankStatusCode?: string;
    authorizationCode?: string;
    [key: string]: any;
}
export interface PaymentResponse {
    transactionId: string;
    status: PaymentStatus;
    amount: number;
    currency: Currency;
    bankId: BankId;
    timestamp: Date;
    bankSpecificData?: BankSpecificData;
    errorMessage?: string;
    errorCode?: string;
    referenceId?: string;
    processingTimeMs?: number;
}
