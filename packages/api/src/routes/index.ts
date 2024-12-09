import { FastifyInstance } from "fastify";
import * as quoteEndpoints from "./quote/controller";
import * as settleEndpoints from "./settle/controller";

const routes = [quoteEndpoints.default, settleEndpoints.default];

export const setupRoutes = (fastify: FastifyInstance) => {
  routes.forEach((route) => {
    fastify.route(route);
  });
};
