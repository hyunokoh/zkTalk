import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function createRedisClient(name: string): Redis {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
    lazyConnect: false,
  });

  client.on('error', (err) => {
    console.error(`[Redis:${name}] Connection error:`, err.message);
  });

  client.on('connect', () => {
    console.info(`[Redis:${name}] Connected to ${REDIS_URL}`);
  });

  client.on('reconnecting', () => {
    console.info(`[Redis:${name}] Reconnecting...`);
  });

  return client;
}

/** Primary Redis client for commands (GET, SET, SADD, etc.) */
export const redis = createRedisClient('primary');

/** Dedicated subscriber connection (cannot issue regular commands while subscribed) */
export const redisSub = createRedisClient('subscriber');

/** Gracefully close both connections */
export async function closeRedis(): Promise<void> {
  await Promise.all([redis.quit(), redisSub.quit()]);
}
