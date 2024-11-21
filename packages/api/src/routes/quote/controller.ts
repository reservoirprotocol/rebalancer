import { FastifyInstance } from "fastify";
import { Quote } from "@services/quote";

export default async function quoteController(fastify: FastifyInstance) {
  fastify.post(
    "/quote",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            requestId: { type: "string", description: "Request ID" },
            recipientAddress: {
              type: "string",
              description: "Address of the solver",
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
            amount: { type: "string", description: "Transfer amount" },
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
    },
    async (request, reply) => {
      const {
        requestId, // store requestId and recipientAddress in db to validate when making payment to bonded solver
        recipientAddress,
        originChainId,
        destinationChainId,
        originCurrency,
        destinationCurrency,
        amount,
      } = request.body as any;

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
      const quoteResponse = quote.getQuote();

      // Send the response
      return reply.send(quoteResponse);
    },
  );
}
