import { BankId } from '../enums/bank-id.enum';
import { Currency } from '../enums/currency.enum';
export interface CustomerDetails {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
}
export interface PaymentRequest {
    bankId: BankId;
    amount: number;
    currency: Currency;
    customerDetails?: CustomerDetails;
    description?: string;
    referenceId?: string;
    metadata?: Record<string, any>;
}
