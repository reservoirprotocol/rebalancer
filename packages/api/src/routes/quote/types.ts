export type QuoteRequest = {
  requestId: string;
  recipientAddress: string;
  originChainId: number;
  destinationChainId: number;
  originCurrency: string;
  destinationCurrency: string;
  amount: string;
};
