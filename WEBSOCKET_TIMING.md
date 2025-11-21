# Testing WebSocket with Slower Execution (Optional)

If you want to see the full order lifecycle in WebSocket more easily, you can temporarily slow down the execution:

## Temporary Change for Testing

Edit `src/services/dexRouter.ts` line 55:

```typescript
// Change from:
await sleep(2000 + Math.random() * 1000); // 2-3s

// To (for testing):
await sleep(10000 + Math.random() * 2000); // 10-12s
```

This gives you 10-12 seconds to:
1. Create order
2. Copy orderId
3. Connect to WebSocket
4. Watch all status updates

**Remember to change it back to 2-3s after testing!**

## Better Approach: Use the Collection Variable

The Postman collection already saves the `orderId` automatically! Here's how:

### Step-by-Step:

1. **Create the order** using "Create Market Order - Sell SOL"
2. The `orderId` is **automatically saved** to `{{orderId}}` variable
3. **Immediately open WebSocket tab**
4. **Use this URL:**
   ```
   ws://localhost:3000/ws/orders/{{orderId}}
   ```
5. Click **Connect**

The `{{orderId}}` will be replaced with the actual ID from your last order!

## What About the "missing orderId" Errors?

Those errors are harmless - they happen when:
- Postman auto-retries failed connections
- You connect without an orderId
- You're testing the WebSocket endpoint

**They don't affect your actual orders at all!** Your orders are processing perfectly as shown in the logs.

## Verify Orders in Database

To see all your completed orders:

```bash
psql "postgres://postgres:postgres@localhost:5432/order_engine"

SELECT id, side, status, selected_dex, executed_price, tx_hash, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;
```

You'll see all your orders completed successfully! ✅
