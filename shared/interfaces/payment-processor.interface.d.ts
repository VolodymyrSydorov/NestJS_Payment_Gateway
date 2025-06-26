import { PaymentRequest } from '../dto/charge.dto';
import { PaymentResponse } from '../dto/payment-response.dto';
import { BankId } from '../enums/bank-id.enum';
export interface BankConfig {
    bankId: BankId;
    apiUrl: string;
    apiKey: string;
    config?: Record<string, any>;
    enabled: boolean;
    timeoutMs?: number;
}
export interface PaymentProcessor {
    readonly bankId: BankId;
    readonly config: BankConfig;
    charge(payload: PaymentRequest): Promise<PaymentResponse>;
    canProcess(payload: PaymentRequest): boolean;
    getDisplayName(): string;
    getProcessorInfo(): any;
}
