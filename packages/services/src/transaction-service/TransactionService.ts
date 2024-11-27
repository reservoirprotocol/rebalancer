import {
  createPublicClient,
  createWalletClient,
  WalletClient,
  http,
  PublicClient,
  ByteArray,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ITransactionService } from "./interface";
import { loadBalance } from "@ponder/utils";
import { EIP1559RawTransaction, LegacyRawTransaction } from "./types";
import { isEIP1559Network } from "./constants";

/**
 * Service for submitting transactions to the blockchain
 *
 * - The TransactionService is used to submit transactions to the blockchain.
 * - It is responsible for signing transactions, submitting them to the network, and handling the response.
 * - If any RPC errors occur it is responsible for handling them appropriately.
 * - It also monitors the transaction pool and resubmits any transactions that has not been included in a block for a while.
 * - The service in its current form is supposed to be called when the rebalancer needs to fill the order. In future
 *   it can be extended to be used by other event listening services to trigger transactions when a particular blockchain event occurs.
 *
 */
export class TransactionService implements ITransactionService {
  private rebalancer: Record<number, WalletClient> = {};
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

    const rebalancerPrivateKey = process.env
      .REBALANCER_PRIVATE_KEY! as `0x${string}`;
    if (!rebalancerPrivateKey) {
      throw new Error("REBALANCER_PRIVATE_KEY environment variable is not set");
    }
    for (const chainId in rpcUrls) {
      this.rebalancer[chainId] = createWalletClient({
        account: privateKeyToAccount(rebalancerPrivateKey),
        transport: loadBalance(
          (rpcUrls[chainId] as string[]).map((url: string) => http(url)),
        ),
      });

      // This was a weird type error from viem, will remove this later
      // Error: Type instantiation is excessively deep and possibly infinite
      // @ts-ignore
      this.rpcClient[chainId] = createPublicClient({
        transport: http(rpcUrls[chainId][0]),
      });
    }
  }

  async sendTransaction(
    transaction: Partial<EIP1559RawTransaction> | Partial<LegacyRawTransaction>,
    chainId: number,
  ): Promise<`0x${string}`> {
    const rebalancer = this.rebalancer[chainId];
    const rpcClient = this.rpcClient[chainId];

    // Fetch nonce, gas limit and gas price in parallel
    // we will reuse the maxFeePerGas to be the gas price for legacy transactions as an optimization
    const [nonce, gas, feeData] = await Promise.all([
      rpcClient.getTransactionCount({
        address: rebalancer.account!.address,
      }),
      rpcClient.estimateGas({
        account: rebalancer.account,
        ...transaction,
      }),
      // Fetch both EIP1559 fees and gas price concurrently
      rpcClient.estimateFeesPerGas(),
    ]);

    // Assign nonce and gas limit
    transaction.nonce = nonce;
    transaction.gas = gas;

    if (isEIP1559Network[chainId]) {
      (transaction as EIP1559RawTransaction).maxFeePerGas =
        feeData.maxFeePerGas;
      (transaction as EIP1559RawTransaction).maxPriorityFeePerGas =
        feeData.maxPriorityFeePerGas;

      const hash = await rebalancer.sendTransaction({
        account: rebalancer.account!,
        ...(transaction as EIP1559RawTransaction),
        chain: null,
        // This was a weird type error from viem, will remove this later
        kzg: {
          blobToKzgCommitment: function (blob: ByteArray): ByteArray {
            throw new Error("Function not implemented.");
          },
          computeBlobKzgProof: function (
            blob: ByteArray,
            commitment: ByteArray,
          ): ByteArray {
            throw new Error("Function not implemented.");
          },
        },
      });
      return hash;
    } else {
      // fetch gas price
      (transaction as LegacyRawTransaction).gasPrice = feeData.maxFeePerGas;

      const hash = await rebalancer.sendTransaction({
        account: rebalancer.account!,
        ...(transaction as LegacyRawTransaction),
        chain: null,
        // This was a weird type error from viem, will remove this later
        kzg: {
          blobToKzgCommitment: function (blob: ByteArray): ByteArray {
            throw new Error("Function not implemented.");
          },
          computeBlobKzgProof: function (
            blob: ByteArray,
            commitment: ByteArray,
          ): ByteArray {
            throw new Error("Function not implemented.");
          },
        },
      });
      return hash;
    }
  }
}
