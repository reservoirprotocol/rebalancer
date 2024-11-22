import { FastifyInstance } from "fastify";
import quoteController from "./controller";

export default async function registerFastifyRoutes(app: FastifyInstance) {
  await quoteController(app);
}
