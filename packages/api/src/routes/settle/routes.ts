import { FastifyInstance } from "fastify";
import settleController from "./controller";

export default async function registerSettleRoute(app: FastifyInstance) {
  await settleController(app);
}
