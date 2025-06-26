import { PaymentProcessor } from './payment-processor.interface';
import { BankId } from '../enums/bank-id.enum';
export interface PaymentProcessorFactory {
    createProcessor(bankId: BankId): PaymentProcessor;
    getAllProcessors(): PaymentProcessor[];
    getSupportedBanks(): BankId[];
    isSupported(bankId: BankId): boolean;
}
