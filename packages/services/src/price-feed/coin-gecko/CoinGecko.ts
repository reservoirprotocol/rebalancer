import { GetPriceParams } from "@rebalancer/types";
import { IPriceFeed } from "../interface";
import { coinGeckoIds } from "./constants";
import { parseUnits } from "viem";
import axios = require("axios");

export class CoinGecko implements IPriceFeed {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.COIN_GECKO_API_KEY as string;

    if (!this.apiKey) {
      throw new Error("COIN_GECKO_API_KEY is not set in environment variables");
    }
  }

  async getPrice(params: GetPriceParams): Promise<number> {
    const { token } = params;

    const tokenId = this.getTokenId(token);

    const tokenUsdPrice = await this.getTokenUsdPrice(tokenId);

    return tokenUsdPrice;
  }

  private async getTokenUsdPrice(tokenId: string): Promise<number> {
    const USD_DECIMALS = 6;

    return await axios.default.get(`https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`, {
      headers: {
        "x-cg-demo-api-key": this.apiKey,
        },
      })
      .then((response: { data: { [x: string]: { [x: string]: any; }; }; }) =>
        Number(parseUnits(
          Number(response.data[tokenId]["usd"]).toFixed(USD_DECIMALS),
          USD_DECIMALS
        ))
      );
  }

  private getTokenId(token: string): string {
    return coinGeckoIds[token];
  }
}
