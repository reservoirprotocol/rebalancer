import { FastifyInstance } from "fastify";
import settleController from "./routes";

export default async function registerFastifyRoutes(app: FastifyInstance) {
  await settleController(app);
}
