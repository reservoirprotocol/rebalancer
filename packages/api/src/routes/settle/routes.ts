import { FastifyInstance } from "fastify";
import settleController from "./controller";

export const registerSettleRoute = async (app: FastifyInstance) => {
  await settleController(app);
}
