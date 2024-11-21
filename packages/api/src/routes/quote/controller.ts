import { FastifyInstance } from "fastify";
import quoteController from "./routes";

export default async function registerFastifyRoutes(app: FastifyInstance) {
  await quoteController(app);
}
