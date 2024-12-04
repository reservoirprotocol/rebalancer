import { FastifyReply, FastifyRequest } from "fastify";
import { Quote } from "@rebalancer/services";
import { RedisClient } from "@rebalancer/database";
import { QuoteRequest } from "./types";
import { privateKeyToAccount } from "viem/accounts";

const hexPatternWith0x = "^0x[0-9a-fA-F]*$";

export default {
  method: "POST",
  url: "/v1/quote",
  schema: {
    body: {
      type: "object",
      properties: {
        requestId: { type: "string", description: "Request ID" },
        recipientAddress: {
          type: "string",
          description: "Address of the bonded solver/filler",
          pattern: hexPatternWith0x,
        },
        originChainId: { type: "number", description: "Origin chainId" },
        destinationChainId: {
          type: "number",
          description: "Destination chainId",
        },
        originCurrencyAddress: {
          type: "string",
          description: "Origin chain currency address",
          pattern: hexPatternWith0x,
        },
        destinationCurrencyAddress: {
          type: "string",
          description: "Destination chain currency address",
          pattern: hexPatternWith0x,
        },
        amount: {
          type: "string",
          description:
            "Transfer amount. Denoted in the smallest unit of the specified currency (e.g., wei for ETH)",
        },
      },
      required: [
        "requestId",
        "recipientAddress",
        "originChainId",
        "destinationChainId",
        "originCurrencyAddress",
        "destinationCurrencyAddress",
        "amount",
      ],
    },
    response: {
      200: {
        type: "object",
        properties: {
          originChainFees: { type: "number" },
          destinationOutputAmount: { type: "number" },
          timeEstimate: { type: "number" },
          rebalancerAddress: { type: "string", pattern: hexPatternWith0x },
        },
      },
    },
  },
  async handler(request: FastifyRequest, reply: FastifyReply) {
    const {
      requestId,
      recipientAddress,
      originChainId,
      destinationChainId,
      originCurrencyAddress,
      destinationCurrencyAddress,
      amount,
    } = request.body as QuoteRequest;

    // Initialize the Quote instance
    const quote = new Quote({
      recipientAddress,
      originChainId,
      destinationChainId,
      amount,
      originCurrencyAddress,
      destinationCurrencyAddress,
    });

    // Generate the quote response
    const quoteResponse = await quote.getQuote();
    
    // Store the request details in Redis
    const redisClient = await RedisClient.getInstance();
    await redisClient.set(
      requestId,
      JSON.stringify({
        requestId,
        recipientAddress,
        originChainId,
        destinationChainId,
        originCurrencyAddress,
        destinationCurrencyAddress,
        amount,
        ...quoteResponse,
      })
    );

    const rebalancerPrivateKey = process.env
      .REBALANCER_PRIVATE_KEY! as `0x${string}`;
    if (!rebalancerPrivateKey) {
      throw new Error("REBALANCER_PRIVATE_KEY environment variable is not set");
    }

    const rebalancerAddress = privateKeyToAccount(rebalancerPrivateKey).address;

    // Send the response
    return reply.send({
      rebalancerAddress,
      ...quoteResponse,
    });
  },
};
