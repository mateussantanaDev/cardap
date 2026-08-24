import Redis, { RedisOptions } from 'ioredis';

function parseRedisOptions(): RedisOptions {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      return {
        host: parsed.hostname || '127.0.0.1',
        port: Number(parsed.port) || 6379,
        password: parsed.password || process.env.REDIS_PASSWORD || undefined,
        username: parsed.username || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
        retryStrategy(times: number) {
          if (times > 3) return null;
          return Math.min(times * 500, 2000);
        }
      };
    } catch {}
  }

  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times: number) {
      if (times > 3) return null;
      return Math.min(times * 500, 2000);
    }
  };
}

export const redisConnectionOptions: RedisOptions = parseRedisOptions();

/**
 * Instância com carregamento sob demanda (lazyConnect) para resiliência.
 */
export const getRedisClient = (): Redis => {
  const client = new Redis(redisConnectionOptions);
  client.on('error', (err) => {
    if (process.env.DEBUG_REDIS) {
      console.warn('[Redis Warning]', err.message);
    }
  });
  return client;
};
