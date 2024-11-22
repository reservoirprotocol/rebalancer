import { FastifyInstance } from "fastify";
import quoteController from "./controller";

export default async function registerQuoteRoute(app: FastifyInstance) {
  await quoteController(app);
}
