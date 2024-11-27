import { CoinGecko } from "./coin-gecko/CoinGecko";
import { IPriceFeed } from "./interface";
import { PriceFeedProvider } from "@rebalancer/types";

export class PriceFeed {
  static getPriceFeed(priceFeedProvider: PriceFeedProvider): IPriceFeed {
    if (priceFeedProvider === PriceFeedProvider.COIN_GECKO) {
      return new CoinGecko();
    }
    throw new Error("Invalid price feed provider");
  }
}
