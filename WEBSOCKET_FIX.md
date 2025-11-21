# Quick Fix Guide - WebSocket 500 Error

## Problem
Getting "Error: Unexpected server response: 500" when connecting to WebSocket.

## Root Cause
Redis and PostgreSQL containers were not running, causing the server to fail when trying to connect to them.

## Solution

### Step 1: Start the containers

```bash
# Start Redis
docker start order-redis

# If container doesn't exist, create it:
docker run --name order-redis -p 6379:6379 -d redis:7

# Start PostgreSQL
docker start order-pg

# If container doesn't exist, create it:
docker run --name order-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=order_engine -p 5432:5432 -d postgres:16
```

### Step 2: Initialize database (if first time)

```bash
psql "postgres://postgres:postgres@localhost:5432/order_engine" -f sql/init.sql
```

### Step 3: Restart the dev server

```bash
# Stop the current server (Ctrl+C in the terminal)
# Then restart:
npm run dev
```

### Step 4: Verify containers are running

```bash
docker ps
```

You should see both `order-redis` and `order-pg` in the list.

### Step 5: Test WebSocket connection

1. Create an order first:
   - POST to `http://localhost:3000/api/orders/execute`
   - Copy the `orderId` from response

2. Connect to WebSocket:
   - URL: `ws://localhost:3000/ws/orders/<orderId>`
   - Should connect successfully now!

## Verification

If everything is working, you should see in server logs:
```
[INFO] Server running on http://localhost:3000
[INFO] WebSocket connected for order { orderId: '...' }
```

## Common Issues

### Redis connection refused
```bash
docker start order-redis
# Wait 2 seconds
npm run dev
```

### PostgreSQL connection refused
```bash
docker start order-pg
# Wait 2 seconds
npm run dev
```

### Containers don't exist
Run the full setup from POSTMAN_GUIDE.md Step 1.
