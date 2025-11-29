import pino from 'pino';
import type { Logger, LoggerOptions } from 'pino';

const logLevel = process.env.LOG_LEVEL ?? 'info';
const isDev = process.env.NODE_ENV !== 'production';

// Logger for standalone use
export const logger: Logger = pino({
  level: logLevel,
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

// Logger config for Fastify
export function getLoggerConfig(): LoggerOptions | boolean {
  if (isDev) {
    return {
      level: logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    };
  }

  return {
    level: logLevel,
  };
}
