import {sql, logger} from '@/shared/index.js';

export async function runSeed(): Promise<void> {
  logger.info('Starting seed...');

  // Clear tables in reverse order of dependencies
  await sql`TRUNCATE purchases, products, users CASCADE`;
  logger.info('Tables cleared');

  // Create test user
  const [user] = await sql`
      INSERT INTO users (email, balance)
      VALUES ('test@example.com', 100.00) 
      RETURNING id, email, balance, version
  `;
  logger.info({ user }, 'Created user');

  // Create test products
  const products = await sql`
      INSERT INTO products (name, price)
      VALUES ('Basic Skin', 9.99),
             ('Premium Skin', 15.49),
             ('Rare Knife', 49.95),
             ('Legendary Gloves', 124.50),
             ('Collector Edition', 299.99) RETURNING id, name, price
  `;
  logger.info({products}, 'Created products');

  logger.info('Seed completed successfully');
}

// Run seed if executed directly
const mainPath = process.argv[1] ?? '';
const isMainModule = import.meta.url === `file://${mainPath}`;

if (isMainModule) {
  runSeed()
    .then(() => sql.end())
    .then(() => {
      logger.info('Connection closed');
      process.exit(0);
    })
    .catch((error: unknown) => {
      logger.error({error}, 'Seed failed');
      process.exit(1);
    });
}
