import { FastifyInstance, FastifyReply, FastifyRequest, FastifySchema, HTTPMethods } from "fastify";
import tracer from "@solver-network/common/src/tracer";

import * as executeEndpoints from "./execute";


const routes = [
    ...executeEndpoints.default,
  ] as {
    url: string;
    method: HTTPMethods;
    handler: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    schema: FastifySchema;
  }[];

// Include request body in Datadog traces
const preHandler = async (req: FastifyRequest, _reply: FastifyReply) => {
  try {
    tracer.scope().active()?.setTag("body", req.body);
  } catch (e) {
    // Skip errors
  }
};

// Include error message in Datadog traces
const onSend = async (
  _req: FastifyRequest,
  reply: FastifyReply,
  payload: any
) => {
  try {
    if (reply.statusCode >= 400) {
      tracer
        .scope()
        .active()
        ?.setTag("error.message", JSON.parse(payload).message);
    }
    tracer.scope().active()?.setTag("manual.keep", true);
  } catch (e) {
    // Skip errors
  }
};

export const setupRoutes = (app: FastifyInstance) => {
  routes.forEach((route) => {
    app.route({
      ...route,
      preHandler,
      onSend,
    });
  });
};
