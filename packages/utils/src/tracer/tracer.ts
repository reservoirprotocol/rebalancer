import tracer from "dd-trace";

if (process.env.DATADOG_AGENT_URL) {
  const service = process.env.SERVICE;

  tracer.init({
    profiling: true,
    logInjection: true,
    runtimeMetrics: true,
    clientIpEnabled: true,
    service,
    url: process.env.DATADOG_AGENT_URL,
    env: process.env.ENVIRONMENT,
  });

  tracer.use("fastify");

  tracer.use("ioredis", {
    enabled: false,
  });

  tracer.use("pg", {
    enabled: false,
  });

  tracer.use("fetch", {
    enabled: false,
  });
}

export default tracer;
