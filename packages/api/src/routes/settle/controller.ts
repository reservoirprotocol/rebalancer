import { FastifyInstance } from "fastify";
import { encodeFunctionData, erc20Abi, zeroAddress } from "viem";
import { TransactionService } from "@services/transaction-service";
import {
  EIP1559RawTransaction,
  LegacyRawTransaction,
} from "@services/transaction-service/types";
import { RedisClient } from "@database";
import { QuoteRequest } from "../quote/types";

export default async function settleController(fastify: FastifyInstance) {
  fastify.post(
    "/settle",
    {
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
    },
    async (request, reply) => {
      const { requestId } = request.body as any;

      // Using requestId fetch the transaction details from db
      const transactionDetails = (await RedisClient.getInstance().get(
        requestId,
      )) as QuoteRequest | undefined;

      if (!transactionDetails) {
        return reply
          .status(404)
          .send({ error: "Transaction details not found" });
      }

      const {
        recipientAddress,
        destinationChainId,
        amount,
        destinationCurrency,
      } = transactionDetails;

      let transaction: EIP1559RawTransaction | LegacyRawTransaction;

      if (destinationCurrency === zeroAddress) {
        transaction = {
          to: recipientAddress as `0x${string}`,
          value: BigInt(amount),
        };
      } else {
        // create ERC 20 transfer transaction
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [recipientAddress as `0x${string}`, BigInt(amount)],
        });

        transaction = {
          to: recipientAddress as `0x${string}`,
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
  );
}
