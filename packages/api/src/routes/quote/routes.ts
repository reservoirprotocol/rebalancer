import { FastifyInstance } from "fastify";
import quoteController from "./controller";

export const registerQuoteRoute = async (app: FastifyInstance) => {
  await quoteController(app);
}
