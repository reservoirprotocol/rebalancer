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
import { PriceFeed } from "../price-feed";
import { PriceFeedProvider } from "@rebalancer/types";

export class Quote {
  private recipientAddress: string;
  private destinationChainId: number;
  private amount: string;
  private destinationCurrency: string;
  private originCurrency: string;
  private rpcClient: Record<number, PublicClient> = {};

  constructor(quoteParams: QuoteParams) {
    const {
      recipientAddress,
      destinationChainId,
      amount,
      destinationCurrency,
      originCurrency,
    } = quoteParams;
    this.recipientAddress = recipientAddress;
    this.destinationChainId = destinationChainId;
    this.amount = amount;
    this.destinationCurrency = destinationCurrency;
    this.originCurrency = originCurrency;

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

    const [destinationCurrencyUsdPrice, originCurrencyUsdPrice] =
      await Promise.all([
        priceFeed.getPrice({
          token: this.destinationCurrency,
        }),
        priceFeed.getPrice({
          token: this.originCurrency,
        }),
      ]);

    /**
     * Destination currency is what rebalancer will pay for the swap
     * Origin currency is what rebalancer will receive by the bonded solver
     * The fees we return should indicate how much unites of destination currency
     * will the rebalancer pay for the operation
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
     * amountDestinationCurrency = amount * (originCurrencyUsdPrice / destinationCurrencyUsdPrice)
     */

    const amountDestinationCurrency = Math.ceil(
      Number(this.amount) *
        (Number(originCurrencyUsdPrice) / Number(destinationCurrencyUsdPrice)),
    );

    if (this.destinationCurrency === "ETH") {
      transactionObject = {
        account,
        to: this.recipientAddress as `0x${string}`,
        value: BigInt(amountDestinationCurrency),
      };
    } else {
      const tokenAddress =
        ERC20TokenMapping[this.destinationChainId][this.destinationCurrency];
      // create ERC 20 transfer function call data
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [
          this.recipientAddress as `0x${string}`,
          BigInt(amountDestinationCurrency),
        ],
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

    /**
     * Now the fees that the rebalancer will quote will be in units of the destination currency
     * For that we will do a similar math like above but origin currency will be set to native asset of the chain
     * That is because the fees will be in units of the native asset of the chain
     *
     * Math:
     * 1 native asset = nativeAssetUsdPrice USD
     * 1 USD = 1 / nativeAssetUsdPrice native asset
     * 1 unit of destination currency = destinationCurrencyUsdPrice USD
     * 1 native asset = destinationCurrencyUsdPrice / nativeAssetUsdPrice destination currency
     *
     * fees = gasLimit * gasPrice * (destinationCurrencyUsdPrice / nativeAssetUsdPrice) * (1 + markUp)
     */

    const nativeAssetUsdPrice = await priceFeed.getPrice({
      token: "ETH",
    });

    let markUp = Number(process.env.MARK_UP as string);

    if (!markUp) {
      markUp = 0;
    }

    const transactionFee =
      (Number(gasPrice) * Number(gasLimit)) / Math.pow(10, 18);

    const fees = Math.ceil(
      transactionFee *
        (destinationCurrencyUsdPrice / nativeAssetUsdPrice) *
        (1 + markUp),
    );

    return fees;
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
