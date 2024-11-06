import { EIP1559RawTransaction, LegacyRawTransaction } from "./types";

export interface ITransactionService {
    sendTransaction(transaction: EIP1559RawTransaction | LegacyRawTransaction): Promise<`0x${string}`>;
}