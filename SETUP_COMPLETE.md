# Backend & Frontend Separation - Setup Complete! ✅

## What Was Done

Your NovelReader project has been successfully split into **backend** and **frontend**:

### Backend Structure Created
- ✅ `backend/` folder with independent Node.js server
- ✅ `backend/db/` - Database functions and migrations
- ✅ `backend/routes/` - API endpoint handlers  
- ✅ `backend/package.json` - Backend dependencies only (no React)
- ✅ `backend/.env.example` - Environment template
- ✅ `backend/DEPLOYMENT.md` - Deployment guide for multiple platforms

### Frontend Updated
- ✅ `Light/package.json` - Removed backend dependencies (express, kuroshiro, etc.)
- ✅ `Light/.env.local` - Updated `VITE_API_URL` to point to backend
- ✅ `Light/.env.example` - Environment template
- ✅ `Light/FRONTEND_DEPLOYMENT.md` - Deployment guide

### Documentation Added
- ✅ `ARCHITECTURE.md` - Complete project architecture and quick start guide
- ✅ `backend/DEPLOYMENT.md` - Backend deployment to Railway, Render, AWS, etc.
- ✅ `Light/FRONTEND_DEPLOYMENT.md` - Frontend deployment to Vercel, Netlify, etc.

## Your Files

### Backend Files (Now in `backend/` folder)
```
backend/
├── server.js              ← Main API server
├── scrape_chapters.js     ← Web scraper (moved here)
├── routes/novels.js       ← API routes
├── db/
│   ├── index.js          ← Database functions
│   ├── schema.sql        ← Database schema
│   ├── migrate.js        ← Migration script
│   └── verify.js         ← Verification script
├── package.json          ← Backend dependencies
├── .env.example
└── DEPLOYMENT.md         ← How to deploy
```

### Frontend Files (In `Light/` folder)
```
Light/
├── src/                  ← React components
├── package.json          ← React dependencies only
├── .env.local            ← VITE_API_URL=http://localhost:3001
├── .env.example
└── FRONTEND_DEPLOYMENT.md
```

## Immediate Next Steps

### 1. Install Dependencies (First Time Only)

```bash
# Backend
cd backend
npm install

# Frontend
cd Light
npm install
```

### 2. Copy Backend Config

```bash
cd backend
cp .env.example .env.local
# Edit .env.local with your Turso credentials
```

### 3. Start Development

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Should output: `🚀 API server running on http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd Light
npm run dev
```
Should output: `Local: http://localhost:5173`

## Configuration Files

### Backend `.env.local`
```env
TURSO_DATABASE_URL=<your_database_url>
TURSO_AUTH_TOKEN=<your_token>
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

### Frontend `.env.local`
```env
VITE_API_URL=http://localhost:3001
```

**Already configured for you!** ✅

## How It Works

```
┌──────────────────┐        HTTP Requests        ┌──────────────────┐
│                  │      (JSON API Calls)       │                  │
│  React Frontend  │────────────────────────────▶│  Express Backend │
│                  │ (port 5173)                │  (port 3001)     │
│  localhost:5173  │                            │                  │
└──────────────────┘                            └──────────────────┘
                                                        │
                                                        │
                                              Database Query
                                                        │
                                                        ▼
                                                  ┌──────────────┐
                                                  │ Turso Database
                                                  └──────────────┘
```

## API Endpoints Available

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/novels` | Get all novels |
| GET | `/api/novels/:id` | Get novel with chapters |
| GET | `/api/novels/:id/chapters/:number` | Get specific chapter |
| POST | `/api/import` | Import novel from URL |
| POST | `/api/cover-image` | Upload cover image |
| POST | `/api/convert` | Convert text to hiragana |
| GET | `/health` | Check server status |

## Updating Your React Components

When calling the backend API, use:

```javascript
const API_BASE = import.meta.env.VITE_API_URL

// Example
async function getNovels() {
  const response = await fetch(`${API_BASE}/api/novels`)
  return response.json()
}
```

## Deployment

### When Ready to Deploy

1. **Deploy Backend First**
   - Choose platform (Railway, Render, AWS)
   - Set environment variables
   - See `backend/DEPLOYMENT.md` for steps

2. **Get Backend URL**
   - Example: `https://novelreader-api.railway.app`

3. **Deploy Frontend**
   - Set `VITE_API_URL` to your backend URL
   - Deploy to Vercel, Netlify, or GitHub Pages
   - See `Light/FRONTEND_DEPLOYMENT.md` for steps

## Common Tasks

### Run database migrations
```bash
cd backend
npm run migrate
```

### Check database status
```bash
cd backend
npm run verify
```

### Build frontend for production
```bash
cd Light
npm run build
```

### Clean everything and start fresh
```bash
# Remove node_modules
rm -rf backend/node_modules Light/node_modules

# Reinstall
cd backend && npm install
cd ../Light && npm install
```

## Troubleshooting

### "Cannot find module" errors
```bash
cd backend  # or Light
rm -rf node_modules
npm install
```

### CORS errors in browser
- Check `CORS_ORIGIN` in `backend/.env.local`
- Should match your frontend URL

### API calls return 404
- Check `VITE_API_URL` in `Light/.env.local`
- Backend should be running on the correct port

### Database connection fails
```bash
cd backend
npm run verify
```

## Key Differences from Before

| Before | After |
|--------|-------|
| One folder with everything | Separate `backend/` and `Light/` |
| `server.js` in Light/ | `server.js` in backend/ |
| `scrape_chapters.js` in Light/ | `scrape_chapters.js` in backend/ |
| `npm run dev:full` for both | Run two separate `npm run dev` commands |
| Database in same package.json | Database-related packages only in backend |

## Environment Variables Summary

**Backend** (`backend/.env.local`):
- `TURSO_DATABASE_URL` ✅ Required
- `TURSO_AUTH_TOKEN` ✅ Required  
- `PORT` - Optional (default: 3001)
- `CORS_ORIGIN` - Optional (default: http://localhost:5173)
- `BLOB_READ_WRITE_TOKEN` - Optional (Vercel Blob only)

**Frontend** (`Light/.env.local`):
- `VITE_API_URL` ✅ Set to http://localhost:3001

## Documentation Files

- 📖 `ARCHITECTURE.md` - Full project structure & quick start
- 📖 `backend/DEPLOYMENT.md` - Deploy backend to Railway, Render, AWS, etc.
- 📖 `Light/FRONTEND_DEPLOYMENT.md` - Deploy frontend to Vercel, Netlify, etc.

## What You Should Remove (Optional)

These files are no longer needed in the Light folder since they're now in backend/:
- ~~`Light/server.js~~` - Moved to backend/
- ~~`Light/scrape_chapters.js~~` - Moved to backend/
- ~~`Light/db/`~~ - Moved to backend/
- ~~`Light/routes/`~~ - Moved to backend/

**Note**: Don't delete them yet if you're running on Vercel. Some old code might reference them. Clean up after confirming backend works independently.

## You're All Set! 🎉

Your backend and frontend are now ready to:
- ✅ Run independently
- ✅ Deploy separately  
- ✅ Scale independently
- ✅ Be developed by different teams

### Quick Start Reminder:
```bash
# Terminal 1
cd backend && npm install && npm run dev

# Terminal 2
cd Light && npm install && npm run dev
```

Then visit: `http://localhost:5173`

---

**Questions?** Check the documentation files or run:
```bash
cd backend && npm run verify
```
