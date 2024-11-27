import Fastify from "fastify";
import { setupRoutes } from "@rebalancer/api";
import * as dotenv from "dotenv";

const fastifyApp = Fastify({
  logger: true,
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
