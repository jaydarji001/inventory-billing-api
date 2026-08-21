# Inventory & Billing API

A REST API for a basic Inventory & Billing system, built with Node.js, TypeScript, Express and PostgreSQL. Covers user authentication, product/customer management, and invoice creation with transactional stock deduction.

## Tech Stack

- Node.js + TypeScript
- Express.js
- PostgreSQL (via `pg`, raw parameterized SQL — no ORM)
- JWT (`jsonwebtoken`) for authentication
- `bcrypt` for password hashing
- `zod` for request validation

## Project Structure

```
src/
  config/         # DB connection pool + transaction helper
  controllers/     # Route handlers (business logic + SQL)
  middleware/      # auth, validation, centralized error handler
  routes/          # Express routers per resource
  validators/       # zod schemas per resource
  utils/           # ApiError, asyncHandler, pagination helper
  app.ts           # Express app (middleware + route wiring)
  server.ts        # Entry point: loads env, checks DB, starts listening
schema.sql          # Full database schema
.env.example
```

## Setup

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 13+ running locally or accessible remotely

### 2. Clone and install

```bash
git clone <your-repo-url>
cd inventory-billing-api
npm install
```

### 3. Create the database and load the schema

```bash
createdb inventory_billing
psql -U postgres -d inventory_billing -f schema.sql
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your actual DB credentials and a JWT secret:

```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventory_billing
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=replace_this_with_a_long_random_secret
JWT_EXPIRES_IN=1d
```

### 5. Run

```bash
# development (auto-restart on file changes)
npm run dev

# production
npm run build
npm start
```

The API starts on `http://localhost:5000` (or whatever `PORT` you set). It will refuse to start if it can't reach the database, so a connection failure fails fast and loud instead of surfacing on the first request.

Health check: `GET /health`

## Authentication

Every route under `/api/products`, `/api/customers`, and `/api/invoices` requires a JWT. Register or log in to get a token, then send it as:

```
Authorization: Bearer <token>
```

## API Reference

All responses follow the shape `{ success, data | message, ... }`. Validation errors return `400` with a `details` array of `{ field, message }`.

### Auth

| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` | password min 6 chars. Returns user + JWT. `409` if email taken. |
| POST | `/api/auth/login` | `{ email, password }` | Returns user + JWT. `401` on bad credentials. |

### Products (auth required)

| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/api/products` | `{ name, sku, price, costPrice, stockQuantity? }` | `409` on duplicate SKU. |
| GET | `/api/products?page=&limit=&search=` | — | Paginated. `search` matches name or SKU. |
| GET | `/api/products/:id` | — | `404` if not found. |
| PUT | `/api/products/:id` | any subset of the create fields | Partial update. |
| DELETE | `/api/products/:id` | — | `400` if the product is referenced by an existing invoice (FK restrict). |

### Customers (auth required)

| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/api/customers` | `{ name, email?, phone?, address? }` | |
| GET | `/api/customers?page=&limit=&search=` | — | Paginated. `search` matches name or email. |
| GET | `/api/customers/:id` | — | |
| PUT | `/api/customers/:id` | any subset of the create fields | |
| DELETE | `/api/customers/:id` | — | `400` if the customer has existing invoices. |

### Invoices (auth required)

| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/api/invoices` | `{ customerId, items: [{ productId, quantity }] }` | See below. |
| GET | `/api/invoices?page=&limit=&customerId=` | — | Paginated. |
| GET | `/api/invoices/:id` | — | Includes line items. |

**Invoice creation runs inside a single PostgreSQL transaction:**

1. The relevant product rows are locked with `SELECT ... FOR UPDATE` (in a fixed order, to avoid deadlocks under concurrent requests).
2. Every requested product must exist and have enough stock — checked before anything is written.
3. If any product is missing, or any item's quantity exceeds available stock, the entire transaction is rolled back with a `400`/`404` and **nothing is persisted** — no invoice, no invoice items, no stock changes, even for the other line items in the same request that would have succeeded on their own.
4. On success: the invoice header and its line items are inserted, and `stock_quantity` is decremented per product, all atomically.

Example:

```bash
curl -X POST http://localhost:5000/api/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "customerId": 1,
    "items": [
      { "productId": 1, "quantity": 2 },
      { "productId": 2, "quantity": 1 }
    ]
  }'
```

## Design Notes

- **No ORM.** All queries are raw, parameterized SQL (`$1, $2, ...`) via `pg` — nothing is string-concatenated into a query, so the API isn't vulnerable to SQL injection.
- **Invoice line items snapshot `unit_price`** at billing time. If a product's price changes later, past invoices still reflect what the customer was actually charged.
- **Centralized error handling** (`src/middleware/errorHandler.ts`) maps common Postgres error codes (unique violation, FK violation, not-null violation, check violation, invalid input) to appropriate HTTP status codes, so controllers don't need repetitive try/catch blocks for DB errors.
- **`ApiError`** is a small helper class for throwing errors with a specific status code from anywhere in the request lifecycle; `asyncHandler` forwards any thrown/rejected error to the error middleware automatically.
- **Pagination** defaults to `page=1&limit=10`, caps `limit` at 100, and returns `{ page, limit, totalItems, totalPages }` alongside the data array.
- Deleting a product or customer that's referenced by an invoice is blocked at the database level (`ON DELETE RESTRICT`) and surfaced as a `400`, not a `500`.

## What I'd add with more time

- Refresh tokens / token revocation (current JWTs are stateless and can't be invalidated before expiry)
- Role-based access control (currently any authenticated user can do anything)
- Automated tests (Jest + supertest) — testing was done manually against a local PostgreSQL instance during development
- Invoice cancellation/refund flow that restocks products, also inside a transaction
