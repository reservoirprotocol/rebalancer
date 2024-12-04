import { FastifyReply, FastifyRequest } from "fastify";
import { encodeFunctionData, erc20Abi, zeroAddress } from "viem";
import {
  TransactionService,
  EIP1559RawTransaction,
  LegacyRawTransaction,
} from "@rebalancer/services";
import { RedisClient } from "@rebalancer/database";
import { QuoteRequest } from "../quote/types";

export default {
  method: "POST",
  url: "/v1/settle",
  schema: {
    body: {
      type: "object",
      properties: {
        requestId: { type: "string", description: "Request ID" },
      },
      required: ["requestId"],
    },
    response: {
      200: {
        type: "object",
        properties: {
          transactionHash: { type: "string" },
        },
      },
    },
  },
  async handler(request: FastifyRequest, reply: FastifyReply) {
    const { requestId } = request.body as any;

    // Using requestId fetch the transaction details from db
    const transactionDetails = await (
      await RedisClient.getInstance()
    ).get(requestId);

    if (!transactionDetails) {
      return reply.status(404).send({ error: "Transaction details not found" });
    }

    const {
      recipientAddress,
      destinationChainId,
      amount,
      destinationCurrencyAddress,
      originChainFees,
      destinationOutputAmount,
    } = JSON.parse(transactionDetails) as QuoteRequest;

    // TODO: We need to subtract the fees but this fees is in the origin chain currency
    // We need to convert it to the destination chain currency here again
    // const amountToTransfer = BigInt(amount) - BigInt(fees);

    let transaction:
      | Partial<EIP1559RawTransaction>
      | Partial<LegacyRawTransaction>;

    if (destinationCurrencyAddress === zeroAddress) {
      transaction = {
        to: recipientAddress as `0x${string}`,
        value: BigInt(amount),
      };
    } else {
      // Hack to convert destinationOutputAmount to USDC amount
      const destinationOutputAmountUsdc =
        destinationOutputAmount * Math.pow(10, 6);

      // create ERC 20 transfer transaction
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipientAddress as `0x${string}`, BigInt(destinationOutputAmountUsdc)],
      });

      transaction = {
        to: destinationCurrencyAddress as `0x${string}`,
        value: BigInt(0),
        data,
      };
    }

    // Initialize the Transaction Service instance
    const transactionService = new TransactionService();

    // Generate the quote response
    const transactionHash = await transactionService.sendTransaction(
      transaction,
      destinationChainId,
    );

    // Send the response
    return reply.send({ transactionHash });
  },
};
