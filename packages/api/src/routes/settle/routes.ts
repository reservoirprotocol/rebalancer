import { FastifyInstance } from "fastify";
import settleController from "./controller";

export default async function registerFastifyRoutes(app: FastifyInstance) {
  await settleController(app);
}
