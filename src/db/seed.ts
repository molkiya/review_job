import { sql, logger } from '@/shared/index.js';

export async function runSeed(): Promise<void> {
  logger.info('Starting seed...');

  // Clear tables in reverse order of dependencies
  await sql`TRUNCATE purchases, products, users, users_raw CASCADE`;
  logger.info('Tables cleared');

  // Create test user using create_user() function (normalizes email)
  const [userResult] = await sql<Array<{ create_user: string }>>`
    SELECT create_user('Test@Example.COM', 100.00) AS create_user
  `;
  
  const userId = userResult?.create_user;
  
  if (!userId) {
    throw new Error('Failed to create user');
  }

  // Get created user with normalized email
  const [user] = await sql`
    SELECT id, email, balance, version
    FROM users
    WHERE id = ${userId}
  `;
  
  logger.info({ user }, 'Created user');

  // Create test products
  const products = await sql`
    INSERT INTO products (name, price)
    VALUES ('Basic Skin', 9.99),
           ('Premium Skin', 15.49),
           ('Rare Knife', 49.95),
           ('Legendary Gloves', 124.50),
           ('Collector Edition', 299.99)
    RETURNING id, name, price
  `;
  logger.info({ products }, 'Created products');

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
      logger.error({ error }, 'Seed failed');
      process.exit(1);
    });
}
