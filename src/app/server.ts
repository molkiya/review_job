import 'dotenv/config';
import 'reflect-metadata';
import { buildApp } from './app.js';
import { config } from '@/config/index.js';
import { logger, connectRedis } from '@/shared/index.js';

async function main(): Promise<void> {
  // Connect to Redis
  await connectRedis();
  logger.info('Redis connected');

  const app = await buildApp();
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  logger.info(`Server started on port ${String(config.PORT)}`);
}

main().catch((err: unknown) => {
  logger.error(err);
  process.exit(1);
});
