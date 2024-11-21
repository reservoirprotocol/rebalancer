import { FastifyInstance } from "fastify";
import { Quote } from "@services/quote";

export default async function quoteController(fastify: FastifyInstance) {
  fastify.post(
    "/settle",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            requestId: { type: "string", description: "Request ID" },
          },
          required: [
            "requestId",
          ],
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
      const {
        requestId,
      } = request.body as any;

      // Using requestId fetch the transaction details from db
      const transactionDetails = await getTransactionDetails(requestId);

      // Initialize the Transaction Service instance
      const transactionService = new TransactionService();

      // Generate the quote response
      const transactionHash = await transactionService.sendTransaction(transactionDetails);

      // Send the response
      return reply.send({ transactionHash });
    }
  );
}
