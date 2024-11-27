import { GetPriceParams } from "@rebalancer/types";

export interface IPriceFeed {
  getPrice: (params: GetPriceParams) => Promise<number>;
}
