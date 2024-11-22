import {
  http,
  PublicClient,
  createPublicClient,
  zeroAddress,
  erc20Abi,
  encodeFunctionData,
} from "viem";
import { QuoteParams } from "./types";
import { blockTime } from "./constants";

export class Quote {
  private recipientAddress: string;
  private destinationChainId: number;
  private amount: string;
  private destinationCurrency: string;
  private rpcClient: PublicClient;

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

    const rpcUrl = process.env.RPC_URLS?.[0] as string;
    this.rpcClient = createPublicClient({
      transport: http(rpcUrl),
    });
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
    let transactionObject;
    if (this.destinationCurrency === zeroAddress) {
      transactionObject = {
        account: zeroAddress,
        to: this.recipientAddress as `0x${string}`,
        value: BigInt(this.amount),
      };
    } else {
      // create ERC 20 transfer function call data
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [this.recipientAddress as `0x${string}`, BigInt(this.amount)],
      });

      transactionObject = {
        account: zeroAddress,
        to: this.recipientAddress as `0x${string}`,
        value: BigInt(0),
        data,
      };
    }
    const [gasLimit, gasPrice] = await Promise.all([
      this.rpcClient.estimateGas(transactionObject),
      this.rpcClient.getGasPrice(),
    ]);

    const markUp = BigInt(process.env.MARK_UP as string);
    const fees = gasLimit * gasPrice + markUp;
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
  public getQuote() {
    return {
      fees: this.calculateFees(),
      timeEstimate: this.estimateTime(),
    };
  }
}
