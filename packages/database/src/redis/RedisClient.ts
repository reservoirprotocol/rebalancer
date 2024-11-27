import { createClient, RedisClientType } from "redis";
import { log } from "@rebalancer/utils";

export class RedisClient {
  private static instance: RedisClientType | null = null;

  // Initialize Redis connection
  private static async connect(): Promise<RedisClientType> {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error("REDIS_URL is not set");
    }

    const client = createClient({
      url: redisUrl,
    });

    client.on("error", (err: { message: any }) =>
      log(`Redis error: ${err.message}`),
    );
    client.on("connect", () => log("Connected to Redis successfully"));

    await client.connect();
    return client as RedisClientType;
  }

  // Get singleton Redis instance
  public static async getInstance(): Promise<RedisClientType> {
    if (!RedisClient.instance) {
      RedisClient.instance = await RedisClient.connect();
    }
    return RedisClient.instance;
  }

  // Graceful shutdown
  public static async disconnect(): Promise<void> {
    if (RedisClient.instance) {
      await RedisClient.instance.quit();
      RedisClient.instance = null;
      log("Redis connection closed");
    }
  }
}
