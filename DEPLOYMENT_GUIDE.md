# Deployment Guide - Order Execution Engine

## Quick Deployment to Render.com (Free Tier)

### Prerequisites
- GitHub account
- Render.com account (sign up at https://render.com)
- Your code pushed to GitHub

---

## Step 1: Push Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Order execution engine with WebSocket support"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR-USERNAME/order-execution-engine.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy PostgreSQL on Render

1. Go to https://dashboard.render.com
2. Click **New** → **PostgreSQL**
3. Configure:
   - **Name**: `order-engine-db`
   - **Database**: `order_engine`
   - **User**: `postgres` (auto-generated)
   - **Region**: Choose closest to you
   - **Plan**: **Free**
4. Click **Create Database**
5. **Copy the Internal Database URL** (starts with `postgres://`)
   - Example: `postgres://order_engine_user:xxx@dpg-xxx.oregon-postgres.render.com/order_engine`

---

## Step 3: Deploy Redis on Render

1. Click **New** → **Redis**
2. Configure:
   - **Name**: `order-engine-redis`
   - **Region**: Same as PostgreSQL
   - **Plan**: **Free** (25MB)
3. Click **Create Redis**
4. **Copy the Internal Redis URL** (starts with `redis://`)
   - Example: `redis://red-xxx:6379`

---

## Step 4: Initialize Database Schema

**Option A: Using Render Shell (after web service is deployed)**
```bash
# In Render Shell for your web service:
psql $DATABASE_URL -f sql/init.sql
```

**Option B: Using local psql**
```bash
# Use the External Database URL from Render dashboard
psql "postgres://order_engine_user:PASSWORD@dpg-xxx-a.oregon-postgres.render.com/order_engine" -f sql/init.sql
```

---

## Step 5: Deploy Web Service

1. Click **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `order-execution-engine`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: (leave empty)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: **Free**

4. **Add Environment Variables:**
   Click **Advanced** → **Add Environment Variable**
   
   ```
   DATABASE_URL = <paste Internal Database URL from Step 2>
   REDIS_URL = <paste Internal Redis URL from Step 3>
   PORT = 3000
   LOG_LEVEL = info
   NODE_ENV = production
   ```

5. Click **Create Web Service**

6. Wait for deployment (5-10 minutes)

---

## Step 6: Verify Deployment

### Test Health Endpoint
```bash
curl https://order-execution-engine.onrender.com/health
# Should return: {"status":"ok"}
```

### Test Order Creation
```bash
curl -X POST https://order-execution-engine.onrender.com/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "baseToken": "SOL",
    "quoteToken": "USDC",
    "side": "sell",
    "amountIn": 1.5,
    "slippageBps": 100
  }'
```

### Test WebSocket
Use Postman or the test script:
```javascript
// Update test-websocket.js
const ws = new WebSocket('wss://order-execution-engine.onrender.com/ws/orders/<orderId>');
```

---

## Step 7: Update README

Add to your README.md:

```markdown
## Live Deployment

**Public API**: https://order-execution-engine.onrender.com

**Endpoints:**
- Health Check: `GET /health`
- Create Order: `POST /api/orders/execute`
- WebSocket: `wss://order-execution-engine.onrender.com/ws/orders/:orderId`

**Note:** Free tier may have cold starts (30s delay on first request after inactivity).
```

---

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Verify `package.json` has correct scripts
- Ensure all dependencies are in `dependencies` not `devDependencies`

### Database Connection Error
- Verify `DATABASE_URL` is set correctly
- Use **Internal Database URL** (not External)
- Check database is in same region as web service

### Redis Connection Error
- Verify `REDIS_URL` is set correctly
- Use **Internal Redis URL**
- Ensure Redis instance is running

### WebSocket Not Working
- Use `wss://` (not `ws://`) for HTTPS deployments
- Verify WebSocket plugin is properly registered
- Check server logs for errors

---

## Alternative: Railway.app

1. Go to https://railway.app
2. Click **New Project** → **Deploy from GitHub**
3. Select your repository
4. Add PostgreSQL: **New** → **Database** → **PostgreSQL**
5. Add Redis: **New** → **Database** → **Redis**
6. Configure environment variables (same as above)
7. Deploy automatically on git push

---

## Cost Considerations

**Render Free Tier:**
- PostgreSQL: 1GB storage, expires after 90 days
- Redis: 25MB, no expiration
- Web Service: 750 hours/month, sleeps after 15min inactivity
- **Total: $0/month**

**Railway Free Tier:**
- $5 credit/month
- Pay-as-you-go after credit exhausted
- No sleep/cold starts

---

## Next Steps

1. ✅ Deploy to Render/Railway
2. ✅ Test all endpoints
3. ✅ Update README with public URL
4. ✅ Record demo video using deployed API
5. ✅ Submit project with all deliverables
