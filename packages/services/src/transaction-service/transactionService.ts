import { createWalletClient, http, Transaction, WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ITransactionService } from "./interface";
import { loadBalance } from "@ponder/utils";
import { EIP1559RawTransaction, LegacyRawTransaction } from "./types";

/**
 * Service for submitting transactions to the blockchain
 *
 * ## Details
 *
 * - The TransactionService is used to submit transactions to the blockchain.
 * - It is responsible for signing transactions, submitting them to the network, and handling the response.
 * - If any RPC errors occur it is responsible for handling them appropriately.
 * - It also monitors the transaction pool and resubmits any transactions that has not been included in a block for a while.
 * - The service in its current form is supposed to be called when the solver needs to fill the order. In future
 *   it can be extended to be used by other event listening services to trigger transactions when a particular blockchain event occurs.
 *
 */
export class TransactionService implements ITransactionService {
  private solver: WalletClient;

  constructor() {
    // Move these checks to config and append these values to the config
    const rpcUrls = process.env.RPC_URLS?.split(",") ?? [];
    if (rpcUrls.length === 0) {
      throw new Error("RPC_URLS environment variable is not set");
    }
    const solverPrivateKey = process.env.SOLVER_PRIVATE_KEY! as `0x${string}`;
    if (!solverPrivateKey) {
      throw new Error("SOLVER_PRIVATE_KEY environment variable is not set");
    }
    this.solver = createWalletClient({
      account: privateKeyToAccount(solverPrivateKey),
      transport: loadBalance(rpcUrls.map((url) => http(url))),
    });
  }

  async sendTransaction(
    transaction: EIP1559RawTransaction | LegacyRawTransaction,
  ): Promise<`0x${string}`> {
    // TODO: Make this fetch from config
    const isEIP1559Network = true;

    if (isEIP1559Network) {
      const hash = await this.solver.sendTransaction({
        account: this.solver.account!,
        ...(transaction as EIP1559RawTransaction),
        chain: null, // Setting this as null as RPC will detect the chain automatically
      });
      return hash;
    } else {
      const hash = await this.solver.sendTransaction({
        account: this.solver.account!,
        ...(transaction as LegacyRawTransaction),
        chain: null,
      });
      return hash;
    }
  }
}
