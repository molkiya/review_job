# Review Job

Backend-сервис для интеграции с Skinport API и обработки покупок.

**Author:** Marat Kiiamov  
**Email:** [kiya.marat@gmail.com](mailto:kiya.marat@gmail.com)

## Стек

| Технология | Версия | Назначение |
|------------|--------|------------|
| Node.js | 22+ | Runtime (ESM) |
| TypeScript | 5.7+ | Strict mode |
| Fastify | 5 | Web framework |
| PostgreSQL | 16 | Database (без ORM) |
| Redis | 7 | Cache |
| class-validator | - | Validation |
| BigNumber.js | - | Финансовые расчёты |
| Pino | - | Logging |

## Быстрый старт

```bash
# 1. Установка
npm install

# 2. Запуск PostgreSQL и Redis
docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=review_job -p 5432:5432 postgres:16-alpine
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 3. Переменные окружения
export POSTGRES_URL=postgres://postgres:postgres@localhost:5432/review_job
export REDIS_URL=redis://localhost:6379

# 4. Миграция и seed
psql $POSTGRES_URL -f src/db/schema.sql
npm run seed

# 5. Запуск
npm run dev
```

## API

### GET /api/items

Получение списка предметов Skinport с кешированием (TTL 300 сек).

```bash
curl http://localhost:3000/api/items
```

```json
{
  "success": true,
  "data": [
    {
      "name": "AK-47 | Redline (Field-Tested)",
      "currency": "USD",
      "minPrice": 12.50,
      "maxPrice": 25.00,
      "suggestedPrice": 15.99
    }
  ]
}
```

### POST /api/purchase

Покупка товара с Optimistic Locking.

```bash
curl -X POST http://localhost:3000/api/purchase \
  -H "Content-Type: application/json" \
  -d '{"userId": "<uuid>", "productId": "<uuid>"}'
```

```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "productId": "550e8400-e29b-41d4-a716-446655440001",
    "price": "15.49",
    "balance": "84.51",
    "status": "completed"
  }
}
```

### Коды ошибок

| Code | Status | Description |
|------|--------|-------------|
| VALIDATION_ERROR | 400 | Ошибка валидации |
| INSUFFICIENT_FUNDS | 400 | Недостаточно средств |
| NOT_FOUND | 404 | Ресурс не найден |
| CONFLICT | 409 | Concurrent modification |
| EXTERNAL_SERVICE_ERROR | 502 | Ошибка внешнего API |
| INTERNAL_ERROR | 500 | Внутренняя ошибка |

## База данных

### Схема

- **UUID** primary keys
- **DECIMAL(12,2)** для денег
- **Optimistic Locking** через поле `version`
- **CHECK constraints** для balance >= 0

```sql
users (id UUID, email, balance, version, created_at, updated_at)
products (id UUID, name, price, created_at)
purchases (id UUID, user_id FK, product_id FK, price, status, created_at)
```

### Optimistic Locking

Вместо `SELECT ... FOR UPDATE` (pessimistic) используется optimistic locking:

```sql
-- Читаем без блокировки
SELECT id, balance, version FROM users WHERE id = $1;

-- Обновляем только если version совпадает
UPDATE users SET balance = $2 
WHERE id = $1 AND version = $3
RETURNING id;

-- Если 0 rows → retry (до 3 раз)
```

## Skinport API

| Параметр | Значение |
|----------|----------|
| Rate Limit | 8 req / 5 min |
| API Cache | 5 min |
| Our TTL | 300 sec |

### Mock Mode

```bash
export SKINPORT_USE_MOCK=true
npm run dev
```

## Структура проекта

```
src/
├── app/                    # Entry point
│   ├── app.ts
│   └── server.ts
├── config/                 # Environment
│   └── index.ts
├── shared/
│   ├── infra/              # DB, Redis, Skinport
│   ├── errors/             # ApiError
│   └── validation/         # class-validator
├── modules/
│   ├── items/              # GET /api/items
│   │   ├── service.ts
│   │   └── routes.ts
│   └── purchase/           # POST /api/purchase
│       ├── dto/
│       ├── service.ts
│       └── routes.ts
└── db/
    ├── schema.sql
    └── seed.ts
```

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Development (tsx watch) |
| `npm run build` | Build TypeScript |
| `npm start` | Production |
| `npm run lint` | ESLint |
| `npm run seed` | Seed database |

## Переменные окружения

| Переменная | Обязательная | По умолчанию |
|------------|--------------|--------------|
| `POSTGRES_URL` | ✅ | — |
| `REDIS_URL` | ✅ | — |
| `PORT` | ❌ | 3000 |
| `LOG_LEVEL` | ❌ | info |
| `SKINPORT_API_URL` | ❌ | https://api.skinport.com/v1/items |
| `SKINPORT_CACHE_TTL` | ❌ | 300 |
| `SKINPORT_USE_MOCK` | ❌ | false |

---

## Notes

> **Кэширование:** В реальном продакшене я бы реализовал более умную кэш-политику (admission, frequency, eviction), но в рамках ТЗ оставляю простую TTL-логику.

> **Concurrency:** Использую Optimistic Locking вместо Pessimistic — это более масштабируемый подход для high-load систем.

---

## Production Improvements (out of scope)

- Docker containerization
- Kubernetes + Helm
- Nginx reverse proxy
- Prometheus + Grafana
- Circuit breaker pattern
- Database migrations (node-pg-migrate)
