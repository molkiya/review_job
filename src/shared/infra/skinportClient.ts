import { config } from '@/config/index.js';
import { logger } from './logger.js';

export interface SkinportItem {
  market_hash_name: string;
  currency: string;
  suggested_price: number | null;
  min_price: number | null;
  max_price: number | null;
  mean_price: number | null;
  median_price: number | null;
  quantity: number;
  created_at: number;
  updated_at: number;
}

// Mock data for development/testing
const MOCK_ITEMS: SkinportItem[] = [
  {
    market_hash_name: 'AK-47 | Redline (Field-Tested)',
    currency: 'USD',
    suggested_price: 15.99,
    min_price: 12.50,
    max_price: 25.00,
    mean_price: 16.50,
    median_price: 15.99,
    quantity: 150,
    created_at: 1535988253,
    updated_at: Date.now() / 1000,
  },
  {
    market_hash_name: 'AWP | Asiimov (Field-Tested)',
    currency: 'USD',
    suggested_price: 35.00,
    min_price: 28.99,
    max_price: 45.00,
    mean_price: 34.00,
    median_price: 33.50,
    quantity: 89,
    created_at: 1535988253,
    updated_at: Date.now() / 1000,
  },
  {
    market_hash_name: '★ Karambit | Fade (Factory New)',
    currency: 'USD',
    suggested_price: 1200.00,
    min_price: 950.00,
    max_price: 1500.00,
    mean_price: 1150.00,
    median_price: 1100.00,
    quantity: 12,
    created_at: 1535988302,
    updated_at: Date.now() / 1000,
  },
  {
    market_hash_name: 'M4A4 | Howl (Field-Tested)',
    currency: 'USD',
    suggested_price: 2500.00,
    min_price: null,
    max_price: null,
    mean_price: null,
    median_price: null,
    quantity: 0,
    created_at: 1535988302,
    updated_at: Date.now() / 1000,
  },
  {
    market_hash_name: 'Glock-18 | Fade (Factory New)',
    currency: 'USD',
    suggested_price: 450.00,
    min_price: 380.00,
    max_price: 550.00,
    mean_price: 440.00,
    median_price: 430.00,
    quantity: 25,
    created_at: 1535988253,
    updated_at: Date.now() / 1000,
  },
];

function isValidSkinportItem(item: unknown): item is SkinportItem {
  if (typeof item !== 'object' || item === null) {
    return false;
  }
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.market_hash_name === 'string' &&
    typeof obj.currency === 'string'
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Use mock if SKINPORT_USE_MOCK=true
const USE_MOCK = process.env.SKINPORT_USE_MOCK === 'true';

export async function fetchItems(retries = 3): Promise<SkinportItem[]> {
  // Return mock data if enabled
  if (USE_MOCK) {
    logger.info('Skinport: using mock data');
    return MOCK_ITEMS;
  }

  const url = `${config.SKINPORT_API_URL}?app_id=730&currency=USD&tradable=0`;
  
  logger.info({ url, retries }, 'Skinport: fetching');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    logger.warn('Skinport: timeout, aborting');
    controller.abort();
  }, 10000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'br, gzip, deflate',
      },
      signal: controller.signal,
    });
    logger.info({ status: response.status }, 'Skinport: response received');
  } catch (err) {
    clearTimeout(timeoutId);
    logger.error({ err }, 'Skinport: fetch failed');
    throw new Error('SkinportFetchFailed');
  } finally {
    clearTimeout(timeoutId);
  }

  // Handle rate limiting
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const waitSeconds = retryAfter !== null ? parseInt(retryAfter, 10) : 60;
    logger.warn({ retries, waitSeconds }, 'Skinport: rate limited');
    
    // Don't wait more than 10 seconds, just fail
    if (waitSeconds > 10) {
      logger.error({ waitSeconds }, 'Skinport: rate limit too long, failing');
      throw new Error('SkinportRateLimited');
    }
    
    if (retries > 0) {
      await sleep(waitSeconds * 1000);
      return fetchItems(retries - 1);
    }
    throw new Error('SkinportRateLimited');
  }

  if (!response.ok) {
    logger.error({ status: response.status }, 'Skinport: bad response');
    throw new Error('SkinportFetchFailed');
  }

  let data: unknown;
  try {
    data = await response.json();
    logger.info('Skinport: parsed JSON');
  } catch {
    logger.error('Skinport: JSON parse failed');
    throw new Error('SkinportFetchFailed');
  }

  if (!Array.isArray(data)) {
    logger.error('Skinport: response is not array');
    throw new Error('SkinportFetchFailed');
  }

  const items: SkinportItem[] = [];
  for (const item of data) {
    if (isValidSkinportItem(item)) {
      const obj = item as unknown as Record<string, unknown>;
      items.push({
        market_hash_name: obj.market_hash_name as string,
        currency: obj.currency as string,
        suggested_price: typeof obj.suggested_price === 'number' ? obj.suggested_price : null,
        min_price: typeof obj.min_price === 'number' ? obj.min_price : null,
        max_price: typeof obj.max_price === 'number' ? obj.max_price : null,
        mean_price: typeof obj.mean_price === 'number' ? obj.mean_price : null,
        median_price: typeof obj.median_price === 'number' ? obj.median_price : null,
        quantity: typeof obj.quantity === 'number' ? obj.quantity : 0,
        created_at: typeof obj.created_at === 'number' ? obj.created_at : 0,
        updated_at: typeof obj.updated_at === 'number' ? obj.updated_at : 0,
      });
    }
  }

  logger.info({ count: items.length }, 'Skinport: done');
  return items;
}
