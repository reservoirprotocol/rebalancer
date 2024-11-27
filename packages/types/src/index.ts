export enum PriceFeedProvider {
  COIN_GECKO = "COIN_GECKO",
}

export type GetPriceParams = {
  inputToken: string;
  outputToken: string;
};
