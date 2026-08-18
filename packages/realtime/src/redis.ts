import Redis, { RedisOptions } from 'ioredis';

export const redisConnectionOptions: RedisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times: number) {
    if (times > 3) return null; // Para de tentar reconectar após 3 tentativas se o Redis não estiver rodando localmente
    return Math.min(times * 500, 2000);
  }
};

/**
 * Instância com carregamento sob demanda (lazyConnect) para resiliência.
 */
export const getRedisClient = (): Redis => {
  const client = new Redis(redisConnectionOptions);
  client.on('error', (err) => {
    // Log apenas se estiver explicitamente ativado
    if (process.env.DEBUG_REDIS) {
      console.warn('[Redis Warning]', err.message);
    }
  });
  return client;
};
