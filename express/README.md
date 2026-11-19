# Backend: Express API + PostgreSQL

TypeScript Express REST API with PostgreSQL through Prisma 7.

## Setup

Needs Node.js 22+ and Docker Desktop.

```bash
cd express
npm install            # also generates the Prisma client
cp .env.example .env
docker compose up -d   # PostgreSQL on localhost:5433, plus a stockwatch_test database
npm run db:migrate     # apply migrations
npm run db:seed        # demo user, 3 watches, 3 days of fake prices
npm run dev            # http://localhost:3000 (API docs at /api/docs)
```

The test database is created by `docker/init-test-db.sql`, which only runs the first time the
volume is created. If you started the container before that file existed, run
`docker compose down -v` and `docker compose up -d` again (this wipes local data).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the API and restart on file changes |
| `npm start` | Start the API once |
| `npm test` | Run the API tests against `TEST_DATABASE_URL` (wiped between tests) |
| `npm run typecheck` | Type-check everything with `tsc` |
| `npm run db:migrate` | Create/apply migrations after editing `prisma/schema.prisma` |
| `npm run db:seed` | Replace the demo data |

## API

Interactive docs: `/api/docs` (Swagger UI); raw spec: `/api/openapi.json`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/watches` | The signed-in user's watches with current price and % change |
| POST | `/api/watches` | Create a watch `{ ticker, purchasePrice, gainPct, lossPct }` |
| GET | `/api/watches/:id` | One watch |
| PATCH | `/api/watches/:id` | Edit purchase price / thresholds (clears notification status) |
| DELETE | `/api/watches/:id` | Delete a watch |
| GET | `/api/watches/:id/prices` | Price history since the watch was created, oldest first |
| GET | `/api/watches/:id/prices.csv` | The same history as a CSV download (`timestamp,price`) |

The CSV is built from PostgreSQL on each request, so nothing is stored for it. On the
Watch Details page a plain link works as the download button, since the browser sends the
login cookie with it: `<a href={`/api/watches/${id}/prices.csv`}>Download CSV</a>`.

Validation (from the proposal): ticker is 1-12 letters, digits, `.` or `-` (upper-cased);
`purchasePrice > 0`; `gainPct > 0`; `lossPct <= 0` (e.g. `-5` means alert at a 5% drop).
Errors are JSON: `{ "error": "..." }`, plus `details` per field for 400s.

## Database (`prisma/schema.prisma`)

- **User**: core fields in Better Auth's shape.
- **Stock**: one row per ticker, shared by all users, with the latest price.
- **Watch**: a user's purchase price and thresholds for one stock, plus `gainNotified` /
  `lossNotified` so an alert is sent once rather than every poll.
- **PriceSnapshot**: price history for graphs. It lives in PostgreSQL (not Spaces) so each
  poll is one insert and a graph is one indexed query.

## Layout

```
src/
  index.ts            starts the server
  app.ts              createApp(): middleware, routes, docs, error handling
  auth.ts             requireUser middleware + temporary dev-user resolver
  db.ts               shared Prisma client
  errors.ts           HttpError and the JSON error handler
  openapi.ts          OpenAPI document (request bodies come from the Zod schemas)
  watches/            routes, Zod schemas, response shape
prisma/               schema, migrations, seed script
tests/                Vitest + supertest API tests
```

## Where the other parts plug in

- **Better Auth**: add Session/Account/Verification to the schema with Better Auth's Prisma
  setup, then replace `resolveDevUserId` in `src/auth.ts` with a session lookup (sketch in the
  TODO there). Until then every request acts as `DEV_USER_ID` from `.env`.
- **Finnhub ticker check**: see the TODO in `POST /api/watches` (`src/watches/routes.ts`).
- **Price poller**: for stocks that have watches, update `Stock.currentPrice` /
  `priceUpdatedAt`, insert a `PriceSnapshot`, and set `gainNotified` / `lossNotified` when
  `% change >= gainPct` or `% change <= lossPct` (then send the email / SSE event).
- **Cloud storage**: add a `File` model (owner, Spaces key, filename, type) with a migration.
- **Frontend**: proxy `/api` to `http://localhost:3000` in `vite.config.ts`.
