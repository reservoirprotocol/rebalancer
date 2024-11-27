import { FastifyError, FastifyRequest, FastifyReply } from "fastify";

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  // Log the error
  console.error("Error:", error);

  // Prepare error response
  const statusCode = error.statusCode || 500;
  const response = {
    error: {
      message: error.message || "Internal Server Error",
      statusCode,
      ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
    },
  };

  // Send the response
  reply.status(statusCode).send(response);
};
