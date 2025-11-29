import BigNumber from 'bignumber.js';
import { sql } from '@/shared/index.js';

// Configure BigNumber for financial calculations
BigNumber.config({
  DECIMAL_PLACES: 2,
  ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
});

export interface PurchaseResult {
  userId: string;
  productId: string;
  price: string;
  balance: string;
  status: string;
}

interface UserRow {
  id: string;
  email: string;
  balance: string;
  version: number;
}

interface ProductRow {
  id: string;
  name: string;
  price: string;
}

const MAX_RETRIES = 3;

/**
 * Purchase with Optimistic Locking
 * 
 * Instead of pessimistic locking (FOR UPDATE), we use optimistic locking:
 * 1. Read user with current version
 * 2. Calculate new balance
 * 3. UPDATE with WHERE version = expected_version
 * 4. If no rows updated → someone else modified, retry
 * 
 * This approach expects success (optimistic) rather than blocking (pessimistic).
 */
export async function purchase(
  userId: string,
  productId: string,
  attempt = 1
): Promise<PurchaseResult> {
  // 1. Read user (no lock)
  const [user] = await sql<UserRow[]>`
    SELECT id, email, balance, version
    FROM users
    WHERE id = ${userId}
  `;

  if (!user) {
    throw new Error('NotFound');
  }

  // 2. Read product
  const [product] = await sql<ProductRow[]>`
    SELECT id, name, price
    FROM products
    WHERE id = ${productId}
  `;

  if (!product) {
    throw new Error('NotFound');
  }

  const userBalance = new BigNumber(user.balance);
  const productPrice = new BigNumber(product.price);
  const expectedVersion = user.version;

  // 3. Check sufficient funds
  if (userBalance.isLessThan(productPrice)) {
    throw new Error('INSUFFICIENT_FUNDS');
  }

  // 4. Calculate new balance
  const newBalance = userBalance.minus(productPrice);

  // 5. Optimistic update: only succeeds if version hasn't changed
  const updateResult = await sql`
    UPDATE users
    SET balance = ${newBalance.toFixed(2)}
    WHERE id = ${userId} AND version = ${expectedVersion}
    RETURNING id
  `;

  // 6. Check if update succeeded
  if (updateResult.length === 0) {
    // Version mismatch — someone else modified the row
    if (attempt < MAX_RETRIES) {
      // Retry with fresh data
      return purchase(userId, productId, attempt + 1);
    }
    throw new Error('CONCURRENT_MODIFICATION');
  }

  // 7. Insert purchase record
  await sql`
    INSERT INTO purchases (user_id, product_id, price, status)
    VALUES (${userId}, ${productId}, ${productPrice.toFixed(2)}, 'completed')
  `;

  return {
    userId,
    productId,
    price: productPrice.toFixed(2),
    balance: newBalance.toFixed(2),
    status: 'completed',
  };
}
