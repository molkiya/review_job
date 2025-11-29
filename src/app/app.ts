import Fastify, { type FastifyInstance } from 'fastify';
import { getLoggerConfig } from '@/shared/index.js';
import { itemsRoutes, purchaseRoutes } from '@/modules/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: getLoggerConfig(),
  });

  // Register API routes
  await app.register(itemsRoutes, { prefix: '/api' });
  await app.register(purchaseRoutes, { prefix: '/api' });

  // Health check endpoint
  app.get('/health', (): { status: string } => {
    return { status: 'ok' };
  });

  return app;
}
