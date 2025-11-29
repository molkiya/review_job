import { createClient } from 'redis';
import { config } from '@/config/index.js';

type RedisClient = ReturnType<typeof createClient>;

const client: RedisClient = createClient({
  url: config.REDIS_URL,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => {
      if (retries > 3) return new Error('Redis max retries');
      return Math.min(retries * 100, 1000);
    },
  },
});

client.on('error', (err: Error) => {
  console.error('Redis Client Error:', err.message);
});

export const redisClient = client;

export async function connectRedis(): Promise<void> {
  if (!client.isOpen) {
    await client.connect();
  }
}

export async function getJSON<T>(key: string): Promise<T | null> {
  if (!client.isReady) {
    throw new Error('Redis not connected');
  }
  const raw = await client.get(key);
  if (raw === null) {
    return null;
  }
  return JSON.parse(raw) as T;
}

export async function setJSON(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  if (!client.isReady) {
    throw new Error('Redis not connected');
  }
  const serialized = JSON.stringify(value);
  if (ttlSeconds !== undefined) {
    await client.setEx(key, ttlSeconds, serialized);
  } else {
    await client.set(key, serialized);
  }
}
