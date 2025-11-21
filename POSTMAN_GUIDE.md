# Postman Testing Guide - Order Execution Engine

## Prerequisites

1. **Start the required services:**

```bash
# Terminal 1: Start PostgreSQL
docker run --name order-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=order_engine -p 5432:5432 -d postgres:16

# Terminal 2: Start Redis
docker run --name order-redis -p 6379:6379 -d redis:7

# Terminal 3: Initialize Database
psql "postgres://postgres:postgres@localhost:5432/order_engine" -f sql/init.sql

# Terminal 4: Start the server
npm run dev
```

2. **Verify server is running:**
   - You should see: `Server running on http://localhost:3000`

---

## Step 1: Import Postman Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select **File** tab
4. Navigate to: `c:/Users/Om Pandey/Desktop/Om Pandey/Eterna Assignment/order-execution-engine/postman_collection.json`
5. Click **Import**

You should now see "Order Execution Engine - Complete Collection" in your Collections.

---

## Step 2: Test Health Check

1. In the collection, click **"Health Check"**
2. Click **Send**
3. **Expected Response:**
   ```json
   {
     "status": "ok"
   }
   ```
4. Status code should be **200 OK**

---

## Step 3: Create Your First Order

### 3.1 Create a Sell Order

1. Click **"Create Market Order - Sell SOL"**
2. Review the request body:
   ```json
   {
     "baseToken": "SOL",
     "quoteToken": "USDC",
     "side": "sell",
     "amountIn": 1.5,
     "slippageBps": 100
   }
   ```
3. Click **Send**
4. **Expected Response:**
   ```json
   {
     "orderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
     "status": "pending",
     "wsUrl": "/ws/orders/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   }
   ```
5. **IMPORTANT:** Copy the `orderId` value - you'll need it for WebSocket connection!

---

## Step 4: Connect to WebSocket (Real-time Updates)

### Method 1: Using Postman WebSocket

1. Click **New** → **WebSocket Request**
2. Enter URL: `ws://localhost:3000/ws/orders/<paste-your-orderId-here>`
   - Example: `ws://localhost:3000/ws/orders/a1b2c3d4-e5f6-7890-abcd-ef1234567890`
3. Click **Connect**
4. **You'll see messages appear in real-time:**

```json
// Message 1 - Pending
{
  "orderId": "a1b2c3d4-...",
  "status": "pending",
  "data": { "order": { ... } },
  "ts": "2025-11-21T14:57:00.000Z"
}

// Message 2 - Routing (fetching DEX quotes)
{
  "orderId": "a1b2c3d4-...",
  "status": "routing",
  "ts": "2025-11-21T14:57:00.100Z"
}

// Message 3 - Building (DEX selected)
{
  "orderId": "a1b2c3d4-...",
  "status": "building",
  "data": {
    "selectedDex": "raydium",
    "quote": {
      "dex": "raydium",
      "price": 100.5,
      "fee": 0.003
    }
  },
  "ts": "2025-11-21T14:57:00.500Z"
}

// Message 4 - Submitted
{
  "orderId": "a1b2c3d4-...",
  "status": "submitted",
  "data": {
    "selectedDex": "raydium",
    "minAcceptablePrice": 99.5
  },
  "ts": "2025-11-21T14:57:00.600Z"
}

// Message 5 - Confirmed (final, after 2-3 seconds)
{
  "orderId": "a1b2c3d4-...",
  "status": "confirmed",
  "data": {
    "txHash": "mock-tx-raydium-abc123",
    "executedPrice": 100.2,
    "selectedDex": "raydium"
  },
  "ts": "2025-11-21T14:57:02.800Z"
}
```

**Total time:** 2-3 seconds from pending to confirmed!

---

## Step 5: Create Multiple Orders (Test Concurrency)

### 5.1 Create a Buy Order

1. Click **"Create Market Order - Buy SOL"**
2. Click **Send**
3. Copy the new `orderId`
4. Open another WebSocket tab with this new `orderId`
5. Watch both WebSocket tabs - both orders process concurrently!

### 5.2 Create Different Token Pair

1. Click **"Create Market Order - Different Token Pair"** (ETH/USDT)
2. Click **Send**
3. Open WebSocket for this order too
4. All orders process in parallel!

---

## Step 6: Test Validation (Error Handling)

### 6.1 Missing Required Fields

1. Click **"Invalid Order - Missing Fields"**
2. Click **Send**
3. **Expected Response:**
   ```json
   {
     "error": "baseToken, quoteToken, side, amountIn are required"
   }
   ```
4. Status code: **400 Bad Request**

### 6.2 Invalid Side Value

1. Click **"Invalid Order - Wrong Side Value"**
2. Click **Send**
3. **Expected Response:**
   ```json
   {
     "error": "side must be buy or sell"
   }
   ```
4. Status code: **400 Bad Request**

---

## Step 7: Test Concurrent Processing (5 Orders)

### Using Collection Runner

1. Click on the collection name: **"Order Execution Engine - Complete Collection"**
2. Click **Run** button (top right)
3. In the Runner:
   - **Deselect all requests** except **"Concurrent Orders - 5 Simultaneous"**
   - Set **Iterations** to **5**
   - Click **Run Order Execution Engine...**
4. **Watch the results:**
   - All 5 orders should be created successfully
   - Each gets a unique `orderId`
   - Check server console - you'll see concurrent processing logs

### Open Multiple WebSockets

1. From the Runner results, copy each `orderId`
2. Open 5 WebSocket tabs, one for each order
3. **Watch all 5 orders process simultaneously!**
4. All should complete within 2-3 seconds

---

## Step 8: Verify DEX Routing Logic

### Check Server Logs

In your terminal where `npm run dev` is running, you'll see logs like:

```
[2025-11-21T14:57:00.500Z] [INFO] Selected DEX route { orderId: '...', bestDex: 'raydium' }
[2025-11-21T14:57:00.500Z] [DEBUG] Comparing DEX quotes { 
  side: 'sell',
  raydium: { price: 100.5, fee: 0.003 },
  meteora: { price: 99.8, fee: 0.002 }
}
```

**For SELL orders:** Higher price is chosen (raydium: 100.5 > meteora: 99.8)  
**For BUY orders:** Lower price is chosen

---

## Step 9: Check Database Records

### Using psql

```bash
# Connect to database
psql "postgres://postgres:postgres@localhost:5432/order_engine"

# View all orders
SELECT id, type, side, base_token, quote_token, amount_in, status, selected_dex, executed_price, tx_hash, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

# View only confirmed orders
SELECT id, side, selected_dex, executed_price, tx_hash 
FROM orders 
WHERE status = 'confirmed';

# Count orders by status
SELECT status, COUNT(*) 
FROM orders 
GROUP BY status;
```

### Using Redis CLI

```bash
# Connect to Redis
redis-cli

# Check active orders (should be empty after completion)
HGETALL active_orders

# Check event history for an order
LRANGE order:events:<orderId> 0 -1
```

---

## Step 10: Advanced Testing Scenarios

### Scenario 1: Rapid Fire Orders

1. Select **"Create Market Order - Sell SOL"**
2. Click **Send** rapidly 10 times
3. Watch server logs - queue limits to 100 orders/minute
4. All orders should be processed with 10 concurrent workers

### Scenario 2: Monitor Queue Processing

```bash
# In Redis CLI
redis-cli

# Monitor queue
KEYS bull:order-execution-queue:*

# Check queue stats
LLEN bull:order-execution-queue:wait
LLEN bull:order-execution-queue:active
LLEN bull:order-execution-queue:completed
```

---

## Troubleshooting

### WebSocket Not Connecting

**Issue:** "Failed to connect to WebSocket"

**Solutions:**
1. Verify server is running: `http://localhost:3000/health`
2. Check `orderId` is correct (copy from POST response)
3. Ensure URL format: `ws://localhost:3000/ws/orders/<orderId>`
4. Try creating a new order and connecting immediately

### No Messages in WebSocket

**Issue:** Connected but no messages appear

**Solutions:**
1. Create a NEW order (old orders may have already completed)
2. Connect to WebSocket IMMEDIATELY after creating order
3. Check server logs for errors
4. Verify Redis is running: `docker ps | grep redis`

### Orders Stuck in Pending

**Issue:** Orders never progress past "pending"

**Solutions:**
1. Check Redis is running: `docker start order-redis`
2. Check server logs for worker errors
3. Restart server: `npm run dev`

---

## Expected Behavior Summary

✅ **Health check** returns 200 OK  
✅ **Order creation** returns 201 with `orderId` and `wsUrl`  
✅ **WebSocket** shows 5 status updates (pending → routing → building → submitted → confirmed)  
✅ **Execution time** is 2-3 seconds  
✅ **DEX routing** chooses best price (higher for sell, lower for buy)  
✅ **Concurrent orders** all process successfully  
✅ **Validation** returns 400 for invalid requests  
✅ **Database** stores all order records  
✅ **Redis** manages active orders and event history  

---

## Demo Video Checklist

When recording your demo video, show:

1. ✅ Server running (`npm run dev`)
2. ✅ Postman collection imported
3. ✅ Create 1 order via POST
4. ✅ Copy `orderId` from response
5. ✅ Open WebSocket with that `orderId`
6. ✅ Show all 5 status updates in real-time
7. ✅ Point out `txHash` and `executedPrice` in final message
8. ✅ Use Collection Runner to create 5 concurrent orders
9. ✅ Show server logs with DEX routing decisions
10. ✅ Run `npm test` showing 24 tests passing

---

## Quick Reference

| Action | Endpoint | Method |
|--------|----------|--------|
| Health Check | `/health` | GET |
| Create Order | `/api/orders/execute` | POST |
| WebSocket Stream | `/ws/orders/:orderId` | WS |

**Environment Variables:**
- `{{baseUrl}}` = `http://localhost:3000`
- `{{orderId}}` = Auto-saved from order creation

**Order Statuses:**
1. `pending` - Order received
2. `routing` - Fetching DEX quotes
3. `building` - DEX selected, transaction building
4. `submitted` - Transaction sent
5. `confirmed` - Execution complete ✅
6. `failed` - Error occurred ❌
