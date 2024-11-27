import { FastifyReply, FastifyRequest } from "fastify";
import { Quote } from "@rebalancer/services";
import { RedisClient } from "@rebalancer/database";
import { QuoteRequest } from "./types";

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
        },
        originChainId: { type: "number", description: "Origin chain ID" },
        destinationChainId: {
          type: "number",
          description: "Destination chain ID",
        },
        originCurrency: {
          type: "string",
          description: "Origin chain currency",
        },
        destinationCurrency: {
          type: "string",
          description: "Destination chain currency",
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
        "originCurrency",
        "destinationCurrency",
        "amount",
      ],
    },
    response: {
      200: {
        type: "object",
        properties: {
          fees: { type: "number" },
          timeEstimate: { type: "number" },
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
      originCurrency,
      destinationCurrency,
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
      originCurrency,
      destinationCurrency,
    });

    // Generate the quote response
    const quoteResponse = await quote.getQuote();

    // Send the response
    return reply.send(quoteResponse);
  },
};
