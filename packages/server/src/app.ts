import express from "express";
import fastify from "fastify";
import registerFastifyRoutes from "@api/routes";
import { errorHandler } from "@api/middleware/errorHandler";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount Fastify instance
const fastifyInstance = fastify({ logger: true });
registerFastifyRoutes(fastifyInstance);

app.use("/api", async (req, res, next) => {
  await fastifyInstance.ready();
  fastifyInstance.server.emit("request", req, res);
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
