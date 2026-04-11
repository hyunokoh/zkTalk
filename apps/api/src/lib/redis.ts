import Redis from 'ioredis';
import { getRedisUrl } from './env.js';
import { logServerError, logServerInfo, summarizeConnectionTarget } from './server-log.js';

const REDIS_URL = getRedisUrl();
const REDIS_TARGET = summarizeConnectionTarget(REDIS_URL);

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
    logServerError(`Redis:${name}`, 'Connection error', err);
  });

  client.on('connect', () => {
    logServerInfo(`Redis:${name}`, `Connected to ${REDIS_TARGET}`);
  });

  client.on('reconnecting', () => {
    logServerInfo(`Redis:${name}`, 'Reconnecting');
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
