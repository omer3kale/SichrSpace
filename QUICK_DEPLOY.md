# 🚀 SichrPlace Deployment Guide - Railway

## Quick Deploy with Railway (Free Tier)

Railway offers 500 hours/month free - perfect for your preview!

### Step 1: Login to Railway
```bash
railway login
```

### Step 2: Initialize Railway Project
```bash
railway init
```

### Step 3: Add Environment Variables
```bash
railway add
# This will prompt you to set environment variables
```

### Step 4: Deploy
```bash
railway up
```

## Required Environment Variables:
- `NODE_ENV=production`
- `PORT=3001`
- `JWT_SECRET=your-secret-key-here`
- `SESSION_SECRET=your-session-secret`
- `MONGODB_URI=your-mongodb-connection-string`

## Custom Domain Setup:
1. Deploy first to get Railway URL
2. Go to Railway dashboard → Settings → Domains
3. Add custom domain: www.sichrplace.com
4. Update your DNS records as instructed

## Alternative Options:

### Option 2: Vercel (Great for frontend + serverless)
```bash
npx vercel --prod
```

### Option 3: Netlify (Easy drag & drop)
1. Build your project: `npm run build`
2. Go to netlify.com
3. Drag & drop your dist folder

### Option 4: GitHub Pages + Cloudflare
1. Push to GitHub
2. Enable GitHub Pages
3. Use Cloudflare for custom domain

## Database Options (Free):
- **MongoDB Atlas**: 512MB free
- **PlanetScale**: 5GB free
- **Supabase**: PostgreSQL with 500MB free

Your project is ready to deploy! Choose the option that works best for you.
