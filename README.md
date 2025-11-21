# Order Execution Engine (Mock Solana DEX)

Backend Task 2 implementation: **market order** execution engine with DEX routing and WebSocket status updates.

> **Order type choice**: I implemented **Market Orders** because they represent the most common, latency‑sensitive path where routing and real‑time status updates matter the most.  
> The same engine can be extended to **Limit Orders** by adding a price condition + scheduler that triggers the same execution flow once the target price is met, and to **Sniper Orders** by wiring a launch/migration event listener that pushes orders into the same queue when a new pool appears.

---

## 🎬 Demo Video

**Watch the system in action**: https://www.youtube.com/watch?v=uLFHS1HfomE

The video demonstrates:
- Creating market orders via Postman
- Real-time WebSocket status updates (pending → routing → building → submitted → confirmed)
- DEX routing decisions (Raydium vs Meteora) in server logs
- Concurrent order processing with BullMQ queue
- All 24 tests passing

---

## Tech Stack

- **Node.js + TypeScript**
- **Fastify** + `@fastify/websocket`
- **BullMQ + Redis** – order queue (10 concurrent workers, 100 jobs/minute)
- **PostgreSQL** – order history
- In‑memory **EventEmitter** + WebSocket – live status streaming
- **Jest** – unit tests
- **Mock DEX Router** – simulates Raydium/Meteora behaviour

---

## Architecture Overview

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Queue
    participant Worker
    participant DEX Router
    participant WebSocket
    participant DB
    participant Redis

    Client->>API: POST /api/orders/execute
    API->>DB: Create order (status: pending)
    API->>Redis: Store in active_orders
    API->>WebSocket: Emit 'pending' event
    API->>Queue: Enqueue job
    API-->>Client: Return orderId + wsUrl
    
    Client->>WebSocket: Connect to ws://host/ws/orders/:id
    WebSocket->>Redis: Replay event history
    WebSocket-->>Client: Send past events
    
    Queue->>Worker: Process order
    Worker->>WebSocket: Emit 'routing'
    Worker->>DEX Router: Get Raydium quote
    Worker->>DEX Router: Get Meteora quote
    DEX Router-->>Worker: Return quotes
    Worker->>Worker: Choose best price
    Worker->>WebSocket: Emit 'building'
    Worker->>WebSocket: Emit 'submitted'
    Worker->>DEX Router: Execute swap (2-3s)
    DEX Router-->>Worker: Return txHash
    Worker->>DB: Update order (confirmed)
    Worker->>Redis: Remove from active_orders
    Worker->>WebSocket: Emit 'confirmed'
    WebSocket-->>Client: Final status
```

### Flow

1. **HTTP POST** `/api/orders/execute`
   - Validates payload.
   - Creates a **market order** in Postgres with status `pending`.
   - Stores snapshot in Redis (`active_orders` hash).
   - Emits WebSocket event `pending`.
   - Enqueues a BullMQ job to process the order.
   - Returns `{ orderId, status, wsUrl }`.

2. **Client WebSocket**
   - Connects to: `ws://<host>:<port>/ws/orders/:orderId`
   - Receives JSON messages:
     ```jsonc
     { "orderId": "...", "status": "pending" | "routing" | "building" | "submitted" | "confirmed" | "failed", "data": { ... } }
     ```

3. **Order Worker (BullMQ)**
   - Up to **10 concurrent** jobs, limited to **100 jobs/min**.
   - For each order:
     1. `routing` – fetch quotes from **Raydium** and **Meteora** (mock).
     2. Choose best price depending on `side` (buy → lowest, sell → highest).
     3. `building` – log selected DEX + quote.
     4. Compute min acceptable price using `slippageBps`.
     5. `submitted` – pretend to send transaction.
     6. `confirmed` – simulate execution (2‑3s delay), store `txHash` + `executedPrice`.
   - On any error, emit `failed` and persist `failureReason`.

4. **Persistence**
   - **PostgreSQL**: `orders` table (see `sql/init.sql`).
   - **Redis**: `active_orders` hash (orderId → JSON snapshot). Entry is removed when the order is `confirmed` or `failed`.

5. **HTTP → WebSocket Pattern**
   - **Same logical endpoint**: `/api/orders/execute` for creation and `/ws/orders/:orderId` for status.  
   - Practically, HTTP POST creates the order and returns `wsUrl`; client then opens the WebSocket connection to stream lifecycle updates.

---

## How to Run Locally

### 1. Prerequisites

- Node.js 18+
- Yarn or npm
- Docker (recommended, for Postgres + Redis)

### 2. Clone & Install

```bash
# unzip the repo from ChatGPT download first
cd order-execution-engine

npm install
# or: yarn
```

### 3. Start Postgres + Redis (Docker)

```bash
docker run --name order-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=order_engine -p 5432:5432 -d postgres:16

docker run --name order-redis -p 6379:6379 -d redis:7
```

### 4. Create `.env`

```bash
cp .env.example .env
# edit if needed
```

### 5. Initialize Database

```bash
psql "postgres://postgres:postgres@localhost:5432/order_engine" -f sql/init.sql
```

### 6. Run Dev Server

```bash
npm run dev
# or: yarn dev
```

Server listens on `http://localhost:3000`.

---

## 🌐 Live Deployment

**Public API**: https://order-execution-engine1.onrender.com

**Endpoints:**
- Health Check: `GET /health`
- Create Order: `POST /api/orders/execute`
- WebSocket: `wss://order-execution-engine1.onrender.com/ws/orders/:orderId`

**Test it:**
```bash
curl https://order-execution-engine1.onrender.com/health
```

**Note:** Free tier may have cold starts (~30s delay on first request after 15min inactivity).

---

## API Usage

### POST `/api/orders/execute`

Create a **market order**.

**Request body:**

```json
{
  "baseToken": "SOL",
  "quoteToken": "USDC",
  "side": "sell",
  "amountIn": 1.5,
  "slippageBps": 100
}
```

- `side`: `"buy"` or `"sell"`
- `slippageBps`: optional, defaults to 100 (1%).

**Response:**

```json
{
  "orderId": "uuid",
  "status": "pending",
  "wsUrl": "/ws/orders/<orderId>"
}
```

### WebSocket `/ws/orders/:orderId`

Connect with Postman, Insomnia, or any WS client:

- URL: `ws://localhost:3000/ws/orders/<orderId>`

You will see a sequence like:

```json
{ "orderId": "...", "status": "pending", "data": { "order": { ... } } }
{ "orderId": "...", "status": "routing" }
{ "orderId": "...", "status": "building", "data": { "selectedDex": "raydium", "quote": { ... } } }
{ "orderId": "...", "status": "submitted", "data": { "minAcceptablePrice": 99.5 } }
{ "orderId": "...", "status": "confirmed", "data": { "txHash": "mock-tx-raydium-xxxx", "executedPrice": 100.1 } }
```

On error:

```json
{ "orderId": "...", "status": "failed", "data": { "error": "reason" } }
```

---

## WebSocket Connection Guide

### Using Postman

1. **Create an order first:**
   - Use the "Create Market Order - Sell SOL" request
   - Copy the `orderId` from the response

2. **Open WebSocket tab:**
   - Click "New" → "WebSocket Request"
   - Enter URL: `ws://localhost:3000/ws/orders/<paste-orderId-here>`
   - Click "Connect"

3. **Watch status updates:**
   - You'll see messages appear in real-time as the order progresses
   - Full lifecycle completes in 2-3 seconds

### Using JavaScript/Browser

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/orders/<orderId>');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Order status:', update.status, update.data);
};

ws.onopen = () => console.log('Connected to order stream');
ws.onerror = (error) => console.error('WebSocket error:', error);
```

### Using wscat (CLI)

```bash
npm install -g wscat
wscat -c ws://localhost:3000/ws/orders/<orderId>
```

---

## DEX Routing Logic

Implemented in `src/services/dexRouter.ts`:

- **Mock quotes**:
  - Raydium: `price = basePrice * (0.98 – 1.02)` with fee `0.003`
  - Meteora: `price = basePrice * (0.97 – 1.02)` with fee `0.002`
- **Decision**:
  - For **sell**: choose **higher** price (better proceeds for seller).
  - For **buy**: choose **lower** price (cheaper for buyer).
- The chosen DEX and quote are logged and sent to the client via WebSocket in the `building` status.

Slippage protection:

```ts
const slippageFraction = order.slippageBps / 10_000;

const minAcceptablePrice =
  order.side === 'sell'
    ? best.price * (1 - slippageFraction)
    : best.price * (1 + slippageFraction);
```

---

## Queue & Concurrency

- Queue name: `order-execution-queue`
- Implementation: `src/queue/orderQueue.ts`
- **Concurrency**: 10 workers
- **Rate limiting**: `max = 100` jobs per `60_000 ms` (≈ 100 orders/min)
- **Retry strategy**:
  - `attempts: 3`
  - `backoff: { type: 'exponential', delay: 1000 }`
- On failure after retries, order status is `failed` and `failureReason` is stored in Postgres.

---

## Tests

Run:

```bash
npm test
# or: yarn test
```

### Test Coverage (12+ tests)

1. **dexRouter.test.ts** (2 tests)
   - DEX routing logic for buy vs sell sides

2. **queue.test.ts** (1 test)
   - Job enqueueing with correct payload and retry config

3. **websocketService.test.ts** (3 tests)
   - WebSocket broadcast functionality
   - Multiple sockets per order
   - Graceful handling of non-existent orders

4. **validation.test.ts** (5 tests)
   - Slippage calculations for buy/sell
   - Price comparison logic
   - Equal price handling
   - Fee validation

5. **retry.test.ts** (4 tests)
   - Exponential backoff configuration
   - Retry attempts limit
   - Job cleanup options
   - Backoff delay validation

6. **concurrency.test.ts** (4 tests)
   - Multiple concurrent order submissions
   - Queue name consistency
   - Rapid submission handling
   - Data integrity for concurrent orders

7. **placeholder-extra.test.ts** (5 tests)
   - Health check endpoint
   - Order status enum validation
   - Queue configuration constants
   - Order side enum validation
   - DEX names validation

**Total: 24 tests** (exceeds ≥10 requirement)

---

## Postman / Insomnia

Use `postman_collection.json`:

1. Import into Postman.
2. Collection includes:
   - Health check
   - Market orders (buy/sell)
   - Different token pairs
   - Validation tests (missing fields, invalid side)
   - Concurrent submission example
3. Environment variables:
   - `{{baseUrl}}` - defaults to `http://localhost:3000`
   - `{{orderId}}` - auto-saved from order creation
4. Run **Collection Runner** with "Concurrent Orders" request set to 5 iterations for concurrent testing.

---

## Deployment to Free Hosting

### Option 1: Render.com

1. **Create account** at [render.com](https://render.com)

2. **Add PostgreSQL database:**
   - Dashboard → New → PostgreSQL
   - Name: `order-engine-db`
   - Free tier selected
   - Copy **Internal Database URL**

3. **Add Redis:**
   - Dashboard → New → Redis
   - Name: `order-engine-redis`
   - Free tier (25MB)
   - Copy **Internal Redis URL**

4. **Create Web Service:**
   - Dashboard → New → Web Service
   - Connect your GitHub repo
   - Settings:
     - **Name**: `order-execution-engine`
     - **Environment**: Node
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Environment Variables**:
       ```
       DATABASE_URL=<paste-postgres-internal-url>
       REDIS_URL=<paste-redis-internal-url>
       PORT=3000
       LOG_LEVEL=info
       ```

5. **Initialize database:**
   - Use Render Shell or connect via `psql` to run `sql/init.sql`

6. **Deploy:**
   - Render auto-deploys on git push
   - Your API will be at: `https://order-execution-engine.onrender.com`

### Option 2: Railway.app

1. **Create account** at [railway.app](https://railway.app)

2. **New Project** → Deploy from GitHub

3. **Add PostgreSQL:**
   - Add service → Database → PostgreSQL
   - Copy connection string from Variables tab

4. **Add Redis:**
   - Add service → Database → Redis
   - Copy connection string

5. **Configure app:**
   - Settings → Environment Variables:
     ```
     DATABASE_URL=<postgres-url>
     REDIS_URL=<redis-url>
     ```
   - Settings → Build:
     - Build command: `npm install && npm run build`
     - Start command: `npm start`

6. **Deploy** and get public URL from Settings → Domains

---

## Troubleshooting

### Redis Connection Error

**Error**: `ECONNREFUSED 127.0.0.1:6379`

**Solution**:
```bash
# Check if Redis is running
docker ps | grep redis

# If not, start it
docker run --name order-redis -p 6379:6379 -d redis:7

# Or restart existing container
docker start order-redis
```

### PostgreSQL Connection Error

**Error**: `ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
# Check if Postgres is running
docker ps | grep postgres

# Start Postgres
docker run --name order-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=order_engine -p 5432:5432 -d postgres:16

# Initialize schema
psql "postgres://postgres:postgres@localhost:5432/order_engine" -f sql/init.sql
```

### Port Already in Use

**Error**: `EADDRINUSE :::3000`

**Solution**:
```bash
# Windows - find and kill process
netstat -ano | findstr :3000
taskkill /PID <process-id> /F

# Or change port in .env
PORT=3001
```

### Tests Hanging / Open Handles

**Issue**: Jest doesn't exit after tests

**Solution**: Tests may be leaving connections open. This is expected with BullMQ/Redis integration tests. Use:
```bash
npm test -- --forceExit
```

Or add to `jest.config.cjs`:
```javascript
module.exports = {
  // ... existing config
  testTimeout: 10000,
  forceExit: true
};
```

### WebSocket Not Receiving Messages

**Issue**: Connected but no messages appear

**Checklist**:
1. Verify `orderId` is correct (copy from POST response)
2. Check server logs for errors
3. Ensure order is being processed (check Redis: `redis-cli HGETALL active_orders`)
4. Try creating a new order and connecting immediately

---

## Demo Video Recording Guide

Record a **1-2 minute video** showing:

### Setup (10 seconds)
- Show terminal with `npm run dev` running
- Show Postman collection imported

### Single Order Flow (30 seconds)
1. Send POST request to create order
2. Copy `orderId` from response
3. Open WebSocket connection with that `orderId`
4. Show status progression in real-time:
   - `pending` → `routing` → `building` → `submitted` → `confirmed`
5. Point out `txHash` and `executedPrice` in final message

### Concurrent Orders (30 seconds)
1. Use Collection Runner
2. Select "Concurrent Orders - 5 Simultaneous"
3. Set iterations to 5
4. Click Run
5. Show all 5 orders created successfully
6. Show logs indicating concurrent processing

### DEX Routing (20 seconds)
1. Show server logs/console
2. Point out DEX routing decisions:
   - "Selected DEX route: raydium" or "meteora"
   - Price comparison logs
3. Create both buy and sell orders
4. Show that buy chooses lower price, sell chooses higher

### Wrap-up (10 seconds)
- Show final test results: `npm test`
- Mention: "All 24 tests passing, exceeds 10 test requirement"

---

## Extending to Limit & Sniper Orders

- **Limit Order**
  - Add fields `limitPrice`, `timeInForce` to the `orders` table and model.
  - Introduce a **price watcher** (e.g. polling oracle or order‑book feed) that checks if market price crosses `limitPrice`.
  - When triggered, push the order id into the **same BullMQ queue**; the processing pipeline (routing, building, submitting, confirming) stays identical.

- **Sniper Order**
  - Subscribe to token launch / pool creation events (Raydium/Meteora SDKs or Solana program logs).
  - When the desired pair launches or migrates, immediately enqueue a sniper order into the same queue.
  - Optionally use more aggressive slippage and stricter timeouts, but reuse the same execution and WebSocket lifecycle.

---

## Real Devnet (Optional Upgrade)

To turn this into a real devnet executor:

1. Replace `MockDexRouter` with Raydium/Meteora SDK calls:
   - Get actual pool info, calculate quotes.
   - Build and sign transactions using `@solana/web3.js` and the respective SDKs.
2. Inject a wallet (keypair) via environment configuration.
3. Handle devnet RPC latency and transaction confirmation:
   - Update statuses (`submitted` ⇒ `confirmed`/`failed`) based on actual confirmations.
4. Keep the **same WebSocket + queue + status model** so the client integration remains unchanged.

---

## Files of Interest

- `src/index.ts` – bootstrap
- `src/app.ts` – Fastify app wiring
- `src/routes/orders.ts` – HTTP + WebSocket endpoints
- `src/queue/orderQueue.ts` – BullMQ setup
- `src/services/orderService.ts` – order lifecycle & status emission
- `src/services/dexRouter.ts` – mock Raydium/Meteora router
- `src/services/websocketService.ts` – WS event bus
- `sql/init.sql` – Postgres schema
- `postman_collection.json` – Comprehensive Postman collection with 7 requests

---

## Public Deployment

**Live API**: _(Add your deployed URL here after deployment)_

Example:
```
https://order-execution-engine.onrender.com
```

Update all Postman requests to use this URL by changing the `{{baseUrl}}` variable.

---

## License

MIT

