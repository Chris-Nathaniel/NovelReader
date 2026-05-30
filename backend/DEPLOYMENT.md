# Backend Deployment Guide

## Overview

The backend is now separated from the frontend. You can deploy it to any platform that supports Node.js.

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the `backend/` directory:

```env
# Database (Turso)
TURSO_DATABASE_URL=your_turso_database_url
TURSO_AUTH_TOKEN=your_turso_auth_token

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS - Set to your frontend URL
CORS_ORIGIN=https://your-frontend-domain.com

# Vercel Blob (Optional - for cloud image storage)
BLOB_READ_WRITE_TOKEN=your_blob_token_optional
```

### 3. Initialize Database

Run migrations to set up the database:

```bash
npm run migrate
```

### 4. Verify Setup

```bash
npm run verify
```

## Deployment Platforms

### Railway.app (Recommended - Simple)

1. Push your code to GitHub
2. Create account on [Railway.app](https://railway.app)
3. Create new project and connect GitHub repo
4. Add environment variables in the Railway dashboard:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `PORT=3001`
   - `NODE_ENV=production`
   - `CORS_ORIGIN=https://your-frontend-domain.com`
5. Deploy automatically

### Render.com

1. Create account on [Render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Set build command: `npm install`
5. Set start command: `npm run start`
6. Add environment variables
7. Deploy

### Heroku (Free tier discontinued, but git deployment still available)

Use Heroku CLI:

```bash
heroku create your-app-name
heroku config:set TURSO_DATABASE_URL=your_url
heroku config:set TURSO_AUTH_TOKEN=your_token
heroku config:set CORS_ORIGIN=https://your-frontend.com
git push heroku main
```

### AWS EC2 (Manual)

1. Launch an EC2 instance (Ubuntu 20.04+)
2. SSH into the instance
3. Install Node.js 18+:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
4. Clone your repository
5. Create `.env.local` with your credentials
6. Run:
   ```bash
   npm install
   npm run migrate
   npm run start
   ```
7. Use PM2 to keep it running:
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name "novelreader-api"
   pm2 startup
   pm2 save
   ```

### DigitalOcean App Platform

1. Push code to GitHub
2. Connect repository to DigitalOcean
3. Set environment variables
4. Deployment will run automatically

### Docker (For any cloud platform)

Create `Dockerfile` in backend/ folder:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production

EXPOSE 3001

CMD ["npm", "run", "start"]
```

Build and run:
```bash
docker build -t novelreader-api .
docker run -p 3001:3001 --env-file .env.local novelreader-api
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `TURSO_DATABASE_URL` | ✅ | Turso database URL |
| `TURSO_AUTH_TOKEN` | ✅ | Turso authentication token |
| `PORT` | ❌ | Server port (default: 3001) |
| `NODE_ENV` | ❌ | 'development' or 'production' |
| `CORS_ORIGIN` | ❌ | Frontend URL for CORS (default: http://localhost:5173) |
| `BLOB_READ_WRITE_TOKEN` | ❌ | Vercel Blob token (optional) |

## API Endpoints

```
POST /api/import              # Import novel from URL
POST /api/cover-image         # Upload cover image
POST /api/convert             # Convert text to hiragana

GET  /api/novels              # Get all novels
GET  /api/novels/:id          # Get novel by ID
GET  /api/novels/:id/chapters # Get chapters for novel
GET  /api/novels/:id/chapters/:number  # Get specific chapter

GET  /health                  # Health check
```

## Development

Run with auto-reload:

```bash
npm run dev
```

This uses `--watch` flag for automatic restart on file changes.

## Troubleshooting

### Database connection fails
- Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are correct
- Run `npm run verify` to test connection
- Check Turso dashboard for database status

### CORS errors
- Set `CORS_ORIGIN` to your frontend domain
- For development: `http://localhost:5173`
- For production: `https://your-domain.com`

### Cover image upload fails
- If Vercel Blob is not configured, images are saved locally
- Make sure `data/covers` directory has write permissions
- For Vercel Blob: verify `BLOB_READ_WRITE_TOKEN` is set

### Port already in use
- Change the `PORT` environment variable
- Or kill the process: `lsof -ti:3001 | xargs kill -9`

## Monitoring

### Check logs:
```bash
pm2 logs novelreader-api  # For PM2
docker logs container_id  # For Docker
```

### Health check:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "kuroshiroReady": true,
  "databaseReady": true
}
```

## Performance Tips

1. **Database**: Keep Turso connections minimal, use connection pooling
2. **Images**: Optimize cover images before upload
3. **Caching**: Add caching headers for novels data
4. **Rate Limiting**: Consider adding rate limiting for `/api/import`

## Security

- ✅ Use HTTPS in production
- ✅ Set proper `CORS_ORIGIN` values
- ✅ Keep secrets in `.env.local` (not in git)
- ✅ Validate all user inputs
- ✅ Use environment-specific configurations

## Next Steps

After deploying the backend:
1. Update frontend's API URL in `Light/.env.local`
2. Deploy the frontend separately
3. Test API connectivity
4. Monitor logs for errors
