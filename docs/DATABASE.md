# Database Schema

## Таблицы

### users

| Поле | Тип | Constraints |
|------|-----|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| balance | DECIMAL(12,2) | NOT NULL, CHECK (>= 0) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW(), auto-update trigger |

### products

| Поле | Тип | Constraints |
|------|-----|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| name | VARCHAR(255) | NOT NULL |
| price | DECIMAL(12,2) | NOT NULL, CHECK (>= 0) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### purchases

| Поле | Тип | Constraints |
|------|-----|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE |
| product_id | UUID | NOT NULL, FK → products(id) ON DELETE RESTRICT |
| price | DECIMAL(12,2) | NOT NULL, CHECK (>= 0) |
| status | purchase_status | NOT NULL, DEFAULT 'completed' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### Enums

```sql
CREATE TYPE purchase_status AS ENUM ('pending', 'completed', 'refunded');
```

## Связи

| Связь | Тип | Описание |
|-------|-----|----------|
| users → purchases | 1:N | ON DELETE CASCADE |
| products → purchases | 1:N | ON DELETE RESTRICT |

## Индексы

```sql
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_product_id ON purchases(product_id);
CREATE INDEX idx_purchases_status ON purchases(status);
```

## Triggers

### updated_at auto-update

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

## Concurrency

Списание средств выполняется **последовательно** через `SELECT ... FOR UPDATE`:
- Блокирует строку пользователя на время транзакции
- Предотвращает race conditions при параллельных покупках
- CHECK constraint `balance >= 0` — дополнительная защита на уровне БД

## Миграция

```bash
psql $POSTGRES_URL -f src/db/schema.sql
```

## Seed

```bash
npm run seed
```
