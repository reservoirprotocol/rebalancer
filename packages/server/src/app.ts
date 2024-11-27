import Fastify from "fastify";
import { setupRoutes } from "@rebalancer/api";
import * as dotenv from "dotenv";

const fastifyApp = Fastify({
  logger: true,
});

// Simulated checks for dependencies
let isRedisConnected = false;


const checkRedisConnection = async () => {
  // TODO: replace this with actual logic
  return isRedisConnected;
};

// Liveness probe
fastifyApp.get('/livez', async (request, reply) => {
  reply.code(200).send('Alive');
});

// Readiness probe
fastifyApp.get('/readyz', async (request, reply) => {
  try {
    const redisReady = await checkRedisConnection();

    if (redisReady) {
      reply.code(200).send('Ready');
    } else {
      reply.code(500).send('Not Ready');
    }
  } catch (error) {
    reply.code(500).send('Not Ready');
  }
});

// Register API routes with a `/api` prefix
fastifyApp.register(setupRoutes, { prefix: "/api" });

// Start the server
const startServer = async () => {
  try {
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    const HOST = process.env.HOST || "0.0.0.0";

    await fastifyApp.listen({ port: PORT, host: HOST });
    console.log(`Server is running at http://localhost:${PORT}/api`);
  } catch (err) {
    fastifyApp.log.error(err);
    process.exit(1);
  }
};

dotenv.config();

// Run the server
startServer();
