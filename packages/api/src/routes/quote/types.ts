export type QuoteRequest = {
  requestId: string;
  recipientAddress: string;
  originChainId: number;
  destinationChainId: number;
  originCurrencyAddress: string;
  destinationCurrencyAddress: string;
  amount: string;
};
