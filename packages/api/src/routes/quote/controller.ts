import { FastifyReply, FastifyRequest } from "fastify";
import { Quote } from "@rebalancer/services";
import { RedisClient } from "@rebalancer/database";
import { QuoteRequest } from "./types";
import { QuoteParams } from "packages/services/dist/quote/types";

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
          fees: { type: "number" },
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

    // Store the request details in Redis
    const redisClient = await RedisClient.getInstance();
    await redisClient.set(requestId, JSON.stringify(request.body));

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

    // Send the response
    return reply.send(quoteResponse);
  },
};
