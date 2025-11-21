# Demo Video Script (1-2 minutes)

## Recording Setup

**Tools:**
- Screen recorder: OBS Studio / Loom / Windows Game Bar
- Postman for API testing
- Terminal showing server logs
- Split screen: Postman (left) + Terminal (right)

**Before Recording:**
1. Start server: `npm run dev`
2. Open Postman with collection imported
3. Open terminal showing server logs
4. Clear terminal for clean recording
5. Test everything once to ensure it works

---

## Script Timeline

### 0:00-0:10 - Introduction (10 seconds)

**Say:**
> "Hi, this is my Order Execution Engine for Solana DEX trading. It processes market orders with real-time WebSocket updates and intelligent DEX routing between Raydium and Meteora."

**Show:**
- README.md open briefly
- Server running in terminal

---

### 0:10-0:30 - Single Order Flow (20 seconds)

**Say:**
> "Let me create a market order. I'll sell 1.5 SOL for USDC with 1% slippage."

**Do:**
1. In Postman, select "Create Market Order - Sell SOL"
2. Click **Send**
3. Show response with `orderId`
4. Quickly copy orderId

**Say:**
> "Now I'll connect to WebSocket to watch the order lifecycle in real-time."

**Do:**
1. Open WebSocket tab
2. Paste URL: `ws://localhost:3000/ws/orders/<orderId>`
3. Click **Connect**

**Show:**
- WebSocket messages appearing:
  - `pending`
  - `routing`
  - `building`
  - `submitted`
  - `confirmed` with txHash

**Point out:**
> "Notice the full lifecycle: pending, routing, building, submitted, and confirmed with a transaction hash."

---

### 0:30-0:50 - Concurrent Orders & DEX Routing (20 seconds)

**Say:**
> "Now let's test concurrent processing. I'll submit 5 orders simultaneously using the Collection Runner."

**Do:**
1. Click collection → **Run**
2. Select "Concurrent Orders - 5 Simultaneous"
3. Set iterations to 5
4. Click **Run**

**Show:**
- All 5 orders being created
- Switch to terminal

**Say:**
> "In the server logs, you can see the DEX routing decisions. The system compares Raydium and Meteora prices and chooses the best one for each order."

**Point out in logs:**
```
[INFO] Selected DEX route { bestDex: 'raydium' }
[INFO] Selected DEX route { bestDex: 'meteora' }
```

---

### 0:50-1:10 - Queue Processing (20 seconds)

**Say:**
> "The queue processes up to 10 orders concurrently with exponential backoff retry logic."

**Show:**
- Terminal logs showing:
  - Multiple orders processing simultaneously
  - Job IDs
  - Execution completion

**Say:**
> "Each order completes in 10-12 seconds with full status tracking. For production, this would be 2-3 seconds."

---

### 1:10-1:30 - Tests & Architecture (20 seconds)

**Say:**
> "The project includes 24 comprehensive tests covering routing logic, queue behavior, and WebSocket lifecycle."

**Do:**
1. Run `npm test` in terminal
2. Show test results

**Show:**
```
Test Suites: 7 passed, 7 total
Tests:       24 passed, 24 total
```

**Say:**
> "The architecture uses Fastify with WebSocket support, BullMQ for queue management, PostgreSQL for persistence, and Redis for active order tracking."

---

### 1:30-1:50 - Design Decisions (20 seconds)

**Say:**
> "I chose market orders because they're the most latency-sensitive and demonstrate real-time routing best. The same engine can be extended to limit orders by adding a price watcher, and to sniper orders by subscribing to token launch events."

**Show:**
- README section on extending to other order types
- Architecture diagram (if visible)

---

### 1:50-2:00 - Conclusion (10 seconds)

**Say:**
> "All code is on GitHub with comprehensive documentation. The system is deployed on Render with a public API. Thank you for watching!"

**Show:**
- README with GitHub link
- Public deployment URL
- Quick scroll through documentation

---

## Recording Checklist

Before recording:
- [ ] Server is running
- [ ] Postman collection imported
- [ ] Terminal is clean and visible
- [ ] Test everything once
- [ ] Close unnecessary windows
- [ ] Mute notifications

During recording:
- [ ] Speak clearly and at moderate pace
- [ ] Show each step clearly
- [ ] Point out important details
- [ ] Keep within 1-2 minute limit

After recording:
- [ ] Review video
- [ ] Check audio quality
- [ ] Verify all requirements shown:
  - [ ] 3-5 orders simultaneously
  - [ ] WebSocket status updates
  - [ ] DEX routing in logs
  - [ ] Queue processing
  - [ ] Test results
- [ ] Upload to YouTube (public or unlisted)
- [ ] Add link to README

---

## Alternative: Shorter Version (1 minute)

If you need to keep it under 1 minute:

**0:00-0:15** - Quick intro + single order with WebSocket
**0:15-0:30** - Concurrent orders (3-5 simultaneously)
**0:30-0:45** - Show logs with DEX routing decisions
**0:45-1:00** - Show tests passing + conclusion

---

## Tips for Great Video

1. **Practice first** - Do a dry run
2. **Speak confidently** - You know your project!
3. **Show, don't just tell** - Let the system demonstrate itself
4. **Highlight key features**:
   - Real-time WebSocket updates
   - Intelligent DEX routing
   - Concurrent processing
   - Comprehensive testing
5. **Keep it concise** - Respect the 1-2 minute limit
6. **End strong** - Mention GitHub, deployment, and documentation

---

## Upload to YouTube

1. Go to https://youtube.com
2. Click **Create** → **Upload video**
3. Select your video file
4. **Title**: "Order Execution Engine - Solana DEX Trading with WebSocket"
5. **Description**:
   ```
   Mock Solana DEX order execution engine with:
   - Real-time WebSocket status updates
   - Intelligent DEX routing (Raydium/Meteora)
   - Concurrent order processing (BullMQ)
   - 24 comprehensive tests
   
   GitHub: [your-repo-link]
   Live Demo: [your-deployment-url]
   ```
6. **Visibility**: Public or Unlisted
7. Click **Publish**
8. Copy video link and add to README
