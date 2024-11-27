import {
  http,
  PublicClient,
  createPublicClient,
  erc20Abi,
  encodeFunctionData,
  Chain,
  EstimateGasParameters,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { QuoteParams } from "./types";
import { blockTime, ERC20TokenMapping } from "./constants";

export class Quote {
  private recipientAddress: string;
  private destinationChainId: number;
  private amount: string;
  private destinationCurrency: string;
  private rpcClient: Record<number, PublicClient> = {};

  constructor(quoteParams: QuoteParams) {
    const {
      recipientAddress,
      destinationChainId,
      amount,
      destinationCurrency,
    } = quoteParams;
    this.recipientAddress = recipientAddress;
    this.destinationChainId = destinationChainId;
    this.amount = amount;
    this.destinationCurrency = destinationCurrency;

    let rpcUrls = JSON.parse(process.env.RPC_URLS ?? "{}") as Record<
      number,
      string[]
    >;
    if (rpcUrls === undefined || Object.keys(rpcUrls).length === 0) {
      throw new Error("RPC_URLS environment variable is not set");
    }

    for (const chainId in rpcUrls) {
      // This was a weird type error from viem, will remove this later
      // Error: Type instantiation is excessively deep and possibly infinite
      // @ts-ignore
      this.rpcClient[chainId] = createPublicClient({
        transport: http(rpcUrls[chainId][0]),
      });
    }
  }

  /**
   * Calculate fees for the transfer of tokens to bonded solver and adds a markup over it.
   */
  private async calculateFees() {
    /**
     * Crafts the transaction object to be sent to the bonded solver
     * Calls eth_estimateGas to estimate the gas cost and eth_gasPrice to get gas price
     * Above two RPC calls are done in parallel for optimization. In future, we can probably cache gas prices
     * returns fees as gasLimit * gasPrice + markup
     */
    let transactionObject: EstimateGasParameters<Chain>;

    // Account we estimate should be the rebalancer address
    const account = privateKeyToAccount(
      process.env.REBALANCER_PRIVATE_KEY as `0x${string}`,
    );

    // TODO: Amount should be converted between currencies and estimated in the destination currency

    if (this.destinationCurrency === "ETH") {
      transactionObject = {
        account,
        to: this.recipientAddress as `0x${string}`,
        value: BigInt(this.amount),
      };
    } else {
      const tokenAddress =
        ERC20TokenMapping[this.destinationChainId][this.destinationCurrency];
      // create ERC 20 transfer function call data
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [this.recipientAddress as `0x${string}`, BigInt(this.amount)],
      });

      transactionObject = {
        account,
        to: tokenAddress as `0x${string}`,
        value: BigInt(0),
        data,
      };
    }
    const [gasLimit, gasPrice] = await Promise.all([
      this.rpcClient[this.destinationChainId].estimateGas(transactionObject),
      this.rpcClient[this.destinationChainId].getGasPrice(),
    ]);

    const markUp = Number(process.env.MARK_UP as string);
    let fees = gasLimit * gasPrice;
    fees += BigInt(Number(fees) * markUp);
    return fees.toString();
  }

  /**
   * Estimate the transfer time based on chain IDs.
   * Initial logic will be waiting for 2 blocks to be mined before considering the transfer complete
   */
  public estimateTime() {
    return blockTime[this.destinationChainId as keyof typeof blockTime] * 2;
  }

  /**
   * Combine all data into the final response structure.
   */
  public async getQuote() {
    return {
      fees: await this.calculateFees(),
      timeEstimate: this.estimateTime(),
    };
  }
}
