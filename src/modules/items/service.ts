import { config } from '@/config/index.js';
import { fetchItems, getJSON, setJSON, logger } from '@/shared/index.js';

const CACHE_KEY = 'skinport:items:min-prices';

export interface PublicItem {
  name: string;
  currency: string;
  minPrice: number | null;
  maxPrice: number | null;
  suggestedPrice: number | null;
}

export async function getItems(): Promise<PublicItem[]> {
  logger.info('getItems: start');

  // Check Redis cache
  try {
    logger.info('getItems: checking cache');
    const cached = await getJSON<PublicItem[]>(CACHE_KEY);
    if (cached !== null) {
      logger.info('getItems: returning cached items');
      return cached;
    }
    logger.info('getItems: cache miss');
  } catch (error) {
    logger.error({ error }, 'getItems: Redis cache read failed');
  }

  // Fetch from Skinport API
  logger.info('getItems: fetching from Skinport');
  const skinportItems = await fetchItems();
  logger.info({ count: skinportItems.length }, 'getItems: fetched items');

  const items: PublicItem[] = skinportItems.map((item) => ({
    name: item.market_hash_name,
    currency: item.currency,
    minPrice: item.min_price,
    maxPrice: item.max_price,
    suggestedPrice: item.suggested_price,
  }));

  // Save to Redis cache
  try {
    logger.info('getItems: saving to cache');
    await setJSON(CACHE_KEY, items, config.SKINPORT_CACHE_TTL);
    logger.info('getItems: cached successfully');
  } catch (error) {
    logger.error({ error }, 'getItems: Failed to cache items');
  }

  logger.info('getItems: done');
  return items;
}

