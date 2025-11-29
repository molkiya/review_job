const env = (key: string): string | undefined => process.env[key];

const required = (key: string): string => {
  const value = env(key);
  if (value === undefined || value === '') {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
};

const optional = (key: string, fallback: string): string => {
  const value = env(key);
  return value !== undefined && value !== '' ? value : fallback;
};

const optionalNumber = (key: string, fallback: number): number => {
  const value = env(key);
  if (value === undefined || value === '') return fallback;
  const num = Number(value);
  if (Number.isNaN(num)) throw new Error(`Env ${key} must be a number`);
  return num;
};

export const config = {
  PORT: optionalNumber('PORT', 3000),
  POSTGRES_URL: required('POSTGRES_URL'),
  REDIS_URL: required('REDIS_URL'),
  SKINPORT_API_URL: optional('SKINPORT_API_URL', 'https://api.skinport.com/v1/items'),
  SKINPORT_CACHE_TTL: optionalNumber('SKINPORT_CACHE_TTL', 300), // 5 min (API cache is 5 min)
} as const;

export type Config = typeof config;
