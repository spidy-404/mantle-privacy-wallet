# Indexer Service Deployment Guide

This guide provides instructions for deploying the Mantle Privacy Wallet indexer service to production.

## Overview

The indexer service is a Node.js application that:
- Scans Mantle Sepolia blockchain for stealth payment events
- Stores events in PostgreSQL database (Supabase)
- Provides REST API for querying indexed data
- Broadcasts real-time updates via WebSocket
- Computes Merkle paths for ZK withdrawal proofs

## Prerequisites

- Node.js 20+ or Docker
- PostgreSQL database (we use Supabase)
- Mantle Sepolia RPC access
- Deployed contract addresses

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Database (required)
DATABASE_URL=postgresql://user:password@host:5432/database

# Blockchain (required)
RPC_URL=https://rpc.sepolia.mantle.xyz
CHAIN_ID=5003

# Contract Addresses (required)
ERC5564_ANNOUNCER_ADDRESS=0x53aCb6c2C0f12A748DB84fbA00bf29d66b3B5259
SHIELDED_POOL_ADDRESS=0xc6277cF453bE422e6BC04D4ff171840069c845f2

# Scanning Configuration (optional)
START_BLOCK=11394476
BLOCKS_PER_SCAN=1000
SCAN_INTERVAL=5000

# Server Ports (optional)
PORT=3001
WS_PORT=3002
```

## Deployment Options

### Option 1: Railway (Recommended)

[Railway](https://railway.app) provides easy deployment with automatic scaling.

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Create a new project:**
   ```bash
   cd packages/indexer
   railway init
   ```

3. **Add environment variables:**
   ```bash
   railway variables set DATABASE_URL="your-database-url"
   railway variables set RPC_URL="https://rpc.sepolia.mantle.xyz"
   railway variables set ERC5564_ANNOUNCER_ADDRESS="0x53aCb6c2C0f12A748DB84fbA00bf29d66b3B5259"
   railway variables set SHIELDED_POOL_ADDRESS="0xc6277cF453bE422e6BC04D4ff171840069c845f2"
   railway variables set CHAIN_ID="5003"
   railway variables set START_BLOCK="11394476"
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Expose service:**
   - Go to Railway dashboard
   - Click on your service → Settings → Networking
   - Generate domain for both ports (3001 and 3002)

### Option 2: Render

[Render](https://render.com) offers free tier for hobby projects.

1. **Create a new Web Service** in Render dashboard

2. **Connect your GitHub repository**

3. **Configure service:**
   - **Name:** mantle-privacy-indexer
   - **Environment:** Node
   - **Build Command:** `cd packages/indexer && pnpm install && pnpm prisma generate && pnpm build`
   - **Start Command:** `cd packages/indexer && node dist/index.js`
   - **Plan:** Free or Starter

4. **Add environment variables** in Render dashboard (same as above)

5. **Deploy** - Render will auto-deploy on every push to main branch

### Option 3: Fly.io

[Fly.io](https://fly.io) provides global edge deployment.

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. **Initialize Fly app:**
   ```bash
   cd packages/indexer
   fly launch
   ```

3. **Set environment variables:**
   ```bash
   fly secrets set DATABASE_URL="your-database-url"
   fly secrets set RPC_URL="https://rpc.sepolia.mantle.xyz"
   fly secrets set ERC5564_ANNOUNCER_ADDRESS="0x53aCb6c2C0f12A748DB84fbA00bf29d66b3B5259"
   fly secrets set SHIELDED_POOL_ADDRESS="0xc6277cF453bE422e6BC04D4ff171840069c845f2"
   fly secrets set CHAIN_ID="5003"
   fly secrets set START_BLOCK="11394476"
   ```

4. **Deploy:**
   ```bash
   fly deploy
   ```

### Option 4: Docker

Use Docker for any platform that supports containers.

1. **Build Docker image:**
   ```bash
   cd /path/to/monorepo
   docker build -f packages/indexer/Dockerfile -t mantle-privacy-indexer .
   ```

2. **Run container:**
   ```bash
   docker run -d \
     --name mantle-privacy-indexer \
     -p 3001:3001 \
     -p 3002:3002 \
     -e DATABASE_URL="your-database-url" \
     -e RPC_URL="https://rpc.sepolia.mantle.xyz" \
     -e ERC5564_ANNOUNCER_ADDRESS="0x53aCb6c2C0f12A748DB84fbA00bf29d66b3B5259" \
     -e SHIELDED_POOL_ADDRESS="0xc6277cF453bE422e6BC04D4ff171840069c845f2" \
     -e CHAIN_ID="5003" \
     -e START_BLOCK="11394476" \
     mantle-privacy-indexer
   ```

3. **Or use Docker Compose:**
   ```bash
   cd packages/indexer
   docker-compose up -d
   ```

### Option 5: VPS (DigitalOcean, AWS EC2, etc.)

For full control, deploy to a VPS.

1. **SSH into your server:**
   ```bash
   ssh user@your-server-ip
   ```

2. **Install Node.js 20+:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   npm install -g pnpm
   ```

3. **Clone repository:**
   ```bash
   git clone https://github.com/yourusername/mantle-privacy-wallet.git
   cd mantle-privacy-wallet/packages/indexer
   ```

4. **Install dependencies:**
   ```bash
   pnpm install
   ```

5. **Set up environment variables:**
   ```bash
   nano .env
   # Paste your environment variables
   ```

6. **Generate Prisma client:**
   ```bash
   pnpm prisma generate
   ```

7. **Build TypeScript:**
   ```bash
   pnpm build
   ```

8. **Install PM2 for process management:**
   ```bash
   npm install -g pm2
   ```

9. **Start service:**
   ```bash
   pm2 start dist/index.js --name mantle-indexer
   pm2 save
   pm2 startup
   ```

10. **Set up Nginx reverse proxy:**
    ```bash
    sudo apt install nginx
    sudo nano /etc/nginx/sites-available/indexer
    ```

    ```nginx
    server {
        listen 80;
        server_name your-domain.com;

        location / {
            proxy_pass http://localhost:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        location /ws {
            proxy_pass http://localhost:3002;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host $host;
        }
    }
    ```

    ```bash
    sudo ln -s /etc/nginx/sites-available/indexer /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

11. **Set up SSL with Let's Encrypt:**
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d your-domain.com
    ```

## Post-Deployment

### 1. Update Frontend Environment Variables

Update your frontend `.env.local` or Vercel environment variables:

```bash
NEXT_PUBLIC_INDEXER_API=https://your-indexer-url.com
NEXT_PUBLIC_INDEXER_WS=wss://your-indexer-url.com/ws
```

### 2. Verify Deployment

Check that the indexer is running:

```bash
# Health check
curl https://your-indexer-url.com/health

# Status endpoint
curl https://your-indexer-url.com/api/status

# Announcements endpoint
curl https://your-indexer-url.com/api/announcements?limit=10
```

### 3. Monitor Logs

**Railway/Render/Fly.io:** Check dashboard logs

**Docker:**
```bash
docker logs -f mantle-privacy-indexer
```

**PM2:**
```bash
pm2 logs mantle-indexer
```

### 4. Database Migrations

If you make schema changes:

```bash
# Development
pnpm prisma migrate dev

# Production
pnpm prisma migrate deploy
```

## Performance Tuning

### Database Optimization

1. **Add indexes** (already in schema):
   - `blockNumber` on Announcement and Deposit
   - `stealthAddress` on Announcement
   - `commitment` on Deposit
   - `leafIndex` on Deposit

2. **Connection pooling:**
   ```bash
   DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10"
   ```

### Scanning Configuration

Adjust based on your needs:

```bash
# Scan larger chunks for faster initial sync
BLOCKS_PER_SCAN=5000

# Reduce interval for real-time updates
SCAN_INTERVAL=3000

# Start from specific block if resyncing
START_BLOCK=11394476
```

### Caching

Consider adding Redis for caching frequently accessed data:

```typescript
// Example: Cache Merkle root
const root = await redis.get('merkle:root') || await tree.getCurrentRoot();
await redis.setex('merkle:root', 300, root); // Cache 5 minutes
```

## Troubleshooting

### Indexer Not Syncing

1. Check RPC connection:
   ```bash
   curl -X POST https://rpc.sepolia.mantle.xyz \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```

2. Verify contract addresses are correct

3. Check database connection

4. Review logs for errors

### WebSocket Connection Issues

1. Ensure WebSocket port (3002) is exposed
2. Check firewall rules
3. Verify WebSocket upgrade headers in proxy
4. Test with:
   ```bash
   npm install -g wscat
   wscat -c ws://your-indexer-url.com:3002
   ```

### High Memory Usage

1. Reduce `BLOCKS_PER_SCAN`
2. Implement pagination for large queries
3. Add connection limits to database URL
4. Restart service periodically with PM2:
   ```bash
   pm2 restart mantle-indexer --cron "0 0 * * *"
   ```

### Database Connection Pool Exhausted

Increase connection limit in DATABASE_URL:
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20"
```

## Security Considerations

1. **Use HTTPS** - Always use SSL/TLS in production
2. **Environment Variables** - Never commit `.env` files
3. **Rate Limiting** - Add rate limiting to API endpoints
4. **CORS** - Configure CORS properly (currently allows all origins)
5. **Database Access** - Use read-only credentials if possible
6. **Monitoring** - Set up uptime monitoring (UptimeRobot, Pingdom, etc.)

## Backup and Recovery

### Database Backups

Supabase provides automatic backups. To manually backup:

```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Disaster Recovery

If indexer goes down:

1. Frontend will fallback to direct blockchain scanning
2. Indexer will resume from `lastBlockScanned` when restarted
3. No data loss - all events are stored in database

## Cost Estimates

### Free Tier Options

- **Supabase Free:** 500MB database, 2GB bandwidth
- **Render Free:** 750 hours/month, sleeps after inactivity
- **Railway Free:** $5 credit/month, ~100 hours runtime
- **Fly.io Free:** 3 shared VMs, 160GB transfer

### Paid Recommendations

For production:
- **Railway Hobby:** $5/month (great for 24/7 service)
- **Render Starter:** $7/month
- **Fly.io Paid:** ~$10/month with redundancy
- **VPS (DigitalOcean):** $6/month basic droplet

## Monitoring

Set up monitoring with:

1. **Uptime:** UptimeRobot, Pingdom
2. **Logs:** Sentry, LogRocket
3. **Metrics:** Prometheus + Grafana
4. **Alerts:** Discord/Telegram webhooks

Example health check endpoint for monitoring:
```
GET /health → 200 OK if running
GET /api/status → Returns sync status
```

## Support

For issues:
- Check logs first
- Verify environment variables
- Test endpoints manually
- Open GitHub issue with logs

## Next Steps

After deployment:
1. Monitor sync progress in logs
2. Test API endpoints
3. Update frontend with production URL
4. Test end-to-end payment flow
5. Set up monitoring and alerts
