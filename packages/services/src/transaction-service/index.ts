import {
  createPublicClient,
  createWalletClient,
  WalletClient,
  http,
  PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ITransactionService } from "./interface";
import { loadBalance } from "@ponder/utils";
import { EIP1559RawTransaction, LegacyRawTransaction } from "./types";

/**
 * Service for submitting transactions to the blockchain
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
  private solver: Record<number, WalletClient> = {};
  private rpcClient: Record<number, PublicClient> = {};

  constructor() {
    // Move these checks to config and append these values to the config
    let rpcUrls = JSON.parse(process.env.RPC_URLS ?? "{}") as Record<
      number,
      string[]
    >;
    if (rpcUrls === undefined || Object.keys(rpcUrls).length === 0) {
      throw new Error("RPC_URLS environment variable is not set");
    }

    const solverPrivateKey = process.env.SOLVER_PRIVATE_KEY! as `0x${string}`;
    if (!solverPrivateKey) {
      throw new Error("SOLVER_PRIVATE_KEY environment variable is not set");
    }
    for (const chainId in rpcUrls) {
      this.solver[chainId] = createWalletClient({
        account: privateKeyToAccount(solverPrivateKey),
        transport: loadBalance(
          (rpcUrls[chainId] as string[]).map((url: string) => http(url)),
        ),
      });
      this.rpcClient[chainId] = createPublicClient({
        transport: http(rpcUrls[chainId][0]),
      });
    }
  }

  async sendTransaction(
    transaction: Partial<EIP1559RawTransaction> | Partial<LegacyRawTransaction>,
    chainId: number,
  ): Promise<`0x${string}`> {
    // TODO: Make this fetch from config
    const isEIP1559Network = true;

    const solver = this.solver[chainId];
    const rpcClient = this.rpcClient[chainId];

    // Fetch nonce, gas limit and gas price in parallel
    // we will reuse the maxFeePerGas to be the gas price for legacy transactions as an optimization
    const [nonce, gas, feeData] = await Promise.all([
      rpcClient.getTransactionCount({
      address: solver.account!.address,
    }),
    rpcClient.estimateGas({
      ...transaction,
    }),
    // Fetch both EIP1559 fees and gas price concurrently
    rpcClient.estimateFeesPerGas(), 
  ]);

    // Assign nonce and gas limit
    transaction.nonce = nonce;
    transaction.gas = gas;

    if (isEIP1559Network) {
      (transaction as EIP1559RawTransaction).maxFeePerGas = feeData.maxFeePerGas;
      (transaction as EIP1559RawTransaction).maxPriorityFeePerGas =
        feeData.maxPriorityFeePerGas;

      const hash = await solver.sendTransaction({
        account: solver.account!,
        ...(transaction as EIP1559RawTransaction),
        chain: null, // Setting this as null as RPC will detect the chain automatically
      });
      return hash;
    } else {
      // fetch gas price
      (transaction as LegacyRawTransaction).gasPrice = feeData.maxFeePerGas;

      const hash = await solver.sendTransaction({
        account: solver.account!,
        ...(transaction as LegacyRawTransaction),
        chain: null,
      });
      return hash;
    }
  }

  private isEIP1559Transaction(
    transaction: EIP1559RawTransaction | LegacyRawTransaction,
  ): transaction is EIP1559RawTransaction {
    return (
      "maxFeePerGas" in transaction && "maxPriorityFeePerGas" in transaction
    );
  }
}
