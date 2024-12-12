import {
  http,
  PublicClient,
  createPublicClient,
  erc20Abi,
  encodeFunctionData,
  Chain,
  EstimateGasParameters,
  zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { QuoteParams } from "./types";
import { blockTime } from "./constants";
import { PriceFeed } from "../price-feed";
import { PriceFeedProvider } from "@rebalancer/types";

export class Quote {
  private recipientAddress: string;
  private destinationChainId: number;
  private amount: string;
  private destinationCurrencyAddress: string;
  private originCurrencyAddress: string;
  private rpcClient: Record<number, PublicClient> = {};

  constructor(quoteParams: QuoteParams) {
    const {
      recipientAddress,
      destinationChainId,
      amount,
      destinationCurrencyAddress,
      originCurrencyAddress,
    } = quoteParams;
    this.recipientAddress = recipientAddress;
    this.destinationChainId = destinationChainId;
    this.amount = amount;
    this.destinationCurrencyAddress = destinationCurrencyAddress;
    this.originCurrencyAddress = originCurrencyAddress;

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

    const priceFeed = PriceFeed.getPriceFeed(PriceFeedProvider.COIN_GECKO);

    const [
      destinationCurrencyUsdPrice,
      originCurrencyUsdPrice,
      nativeAssetUsdPrice,
    ] = await Promise.all([
      priceFeed.getPrice({
        token: this.destinationCurrencyAddress,
      }),
      priceFeed.getPrice({
        token: this.originCurrencyAddress,
      }),
      priceFeed.getPrice({
        token: zeroAddress,
      }),
    ]);

    /**
     * Destination currency is what rebalancer will pay for the swap
     * Origin currency is what rebalancer will receive by the bonded solver
     * The fees we return to the bonded solver should indicate how much units of origin chain currency
     * will take as fees for the operation whose math is below:
     *
     * Math:
     * 1 unit of origin currency = originCurrencyUsdPrice USD
     * 1 unit of native asset = nativeAssetUsdPrice USD
     * 1 USD = 1 / originCurrencyUsdPrice origin currency
     * 1 USD = 1 / nativeAssetUsdPrice native asset
     * By equating and simplifying, we get:
     * 1 native asset = (originCurrencyUsdPrice / nativeAssetUsdPrice) origin currency
     * fees = transactionFee * (originCurrencyUsdPrice / nativeAssetUsdPrice)
     *
     * The amount to transfer to the bonded solver will be the destinationOutputAmount whose math
     * is below:
     *
     * Math:
     * 1 unit of origin currency = originCurrencyUsdPrice USD
     * 1 unit of destination currency = destinationCurrencyUsdPrice USD
     * 1 USD = 1 / originCurrencyUsdPrice origin currency
     * 1 USD = 1 / destinationCurrencyUsdPrice destination currency
     * By equating and simplifying, we get:
     * 1 origin currency = (originCurrencyUsdPrice / destinationCurrencyUsdPrice) destination currency
     *
     * Now the amount of destination currency that rebalancer will pay for the operation is:
     * destinationOutputAmount = amount * (originCurrencyUsdPrice / destinationCurrencyUsdPrice)
     */

    let destinationOutputAmount = Math.ceil(
      (Number(this.amount) * Number(originCurrencyUsdPrice)) /
        (Number(destinationCurrencyUsdPrice) * Math.pow(10, 18)),
    );

    if (this.destinationCurrencyAddress === zeroAddress) {
      transactionObject = {
        account,
        to: this.recipientAddress as `0x${string}`,
        value: BigInt(destinationOutputAmount),
      };
    } else {
      // create ERC 20 transfer function call data
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [
          this.recipientAddress as `0x${string}`,
          BigInt(destinationOutputAmount),
        ],
      });

      transactionObject = {
        account,
        to: this.destinationCurrencyAddress as `0x${string}`,
        value: BigInt(0),
        data,
      };
    }

    const [gasLimit, gasPrice] = await Promise.all([
      this.rpcClient[this.destinationChainId].estimateGas(transactionObject),
      this.rpcClient[this.destinationChainId].getGasPrice(),
    ]);

    let markUp = Number(process.env.MARK_UP as string);

    if (!markUp) {
      markUp = 0;
    }

    const transactionFee =
      (Number(gasPrice) * Number(gasLimit)) / Math.pow(10, 18);

    const fees =
      transactionFee *
      (originCurrencyUsdPrice / nativeAssetUsdPrice) *
      (1 + markUp);

    destinationOutputAmount = destinationOutputAmount - fees;

    return {
      fees,
      destinationOutputAmount,
    };
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
      ...(await this.calculateFees()),
      timeEstimate: this.estimateTime(),
    };
  }
}
