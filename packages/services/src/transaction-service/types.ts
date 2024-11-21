export type EIP1559RawTransaction = {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
  nonce: number;
  gas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
};

export type LegacyRawTransaction = {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
  nonce: number;
  gas: bigint;
  gasPrice: bigint;
};
