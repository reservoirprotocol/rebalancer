import { FastifyReply, FastifyRequest } from "fastify";
import { encodeFunctionData, erc20Abi } from "viem";
import {
  TransactionService,
  EIP1559RawTransaction,
  LegacyRawTransaction,
} from "@rebalancer/services";
import { RedisClient } from "@rebalancer/database";
import { QuoteRequest } from "../quote/types";
import { ERC20TokenMapping } from "../constants";

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
      destinationCurrency,
    } = JSON.parse(transactionDetails) as QuoteRequest;

    let transaction:
      | Partial<EIP1559RawTransaction>
      | Partial<LegacyRawTransaction>;

    if (destinationCurrency === "ETH") {
      transaction = {
        to: recipientAddress as `0x${string}`,
        value: BigInt(amount),
      };
    } else {
      // TODO: Fetch this from redis too
      const tokenAddress =
        ERC20TokenMapping[destinationChainId][destinationCurrency];
      // create ERC 20 transfer transaction
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipientAddress as `0x${string}`, BigInt(amount)],
      });

      transaction = {
        to: tokenAddress as `0x${string}`,
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
