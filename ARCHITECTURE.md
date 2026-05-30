# NovelReader - Backend & Frontend Separation

## Project Structure

Your project is now split into **backend** and **frontend** for independent deployment:

```
NovelReader/
├── backend/                 # Node.js Express API server
│   ├── db/                 # Database functions & migrations
│   ├── routes/             # API route handlers
│   ├── server.js           # Main server file
│   ├── scrape_chapters.js  # Web scraper
│   ├── package.json        # Backend dependencies
│   ├── .env.example        # Environment template
│   └── DEPLOYMENT.md       # Deployment guide
│
├── Light/                  # React frontend
│   ├── src/               # React components
│   ├── public/            # Static files
│   ├── package.json       # Frontend dependencies (React only)
│   ├── .env.example       # Environment template
│   ├── vite.config.js     # Build configuration
│   └── FRONTEND_DEPLOYMENT.md  # Frontend deployment guide
```

## Why Split Backend and Frontend?

✅ **Independent Scaling** - Deploy frontend and backend separately
✅ **Different Requirements** - Frontend is static (Vercel, Netlify), backend needs Node.js
✅ **Team Development** - Frontend and backend teams can work independently
✅ **Environment Management** - Different configs for dev/prod

## Quick Start

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Create .env.local file
cp .env.example .env.local
# Edit .env.local with your Turso database credentials

# 4. Run migrations
npm run migrate

# 5. Start backend (development)
npm run dev
```

Backend runs on: `http://localhost:3001`

### Frontend Setup

```bash
# 1. Navigate to frontend
cd Light

# 2. Install dependencies
npm install

# 3. Create .env.local file
cp .env.example .env.local
# The default VITE_API_URL=http://localhost:3001 is already set

# 4. Start frontend (development)
npm run dev
```

Frontend runs on: `http://localhost:5173`

## Development Workflow

### Option 1: Run Both Manually (Two Terminals)

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd Light
npm run dev
```

### Option 2: Run in Docker (Single Command)

Create `docker-compose.yml` in root:

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    env_file: backend/.env.local
    
  frontend:
    build: ./Light
    ports:
      - "5173:5173"
    env_file: Light/.env.local
    environment:
      - VITE_API_URL=http://backend:3001
```

Run:
```bash
docker-compose up
```

## Environment Configuration

### Backend (.env.local)

```env
# Required
TURSO_DATABASE_URL=your_database_url
TURSO_AUTH_TOKEN=your_auth_token

# Optional
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
BLOB_READ_WRITE_TOKEN=optional_vercel_blob_token
```

### Frontend (.env.local)

```env
# Points to your backend
VITE_API_URL=http://localhost:3001
```

## API Integration

Your frontend can now make API calls to the backend:

```javascript
const API_BASE = import.meta.env.VITE_API_URL

// Example API call
async function fetchNovels() {
  const response = await fetch(`${API_BASE}/api/novels`)
  return response.json()
}
```

## Deployment

### Deploy Backend First

Choose a platform (Railway, Render, AWS, etc.):

📖 See `backend/DEPLOYMENT.md` for detailed instructions

Example (Railway):
```bash
git push origin main
# Railway auto-deploys from main branch
```

Get your backend URL: `https://your-backend-app.railway.app`

### Deploy Frontend

Choose a static host (Vercel, Netlify, etc.):

📖 See `Light/FRONTEND_DEPLOYMENT.md` for detailed instructions

Set environment variable:
```
VITE_API_URL=https://your-backend-app.railway.app
```

Then deploy:
```bash
git push origin main
# Vercel/Netlify auto-deploys from main branch
```

## API Endpoints

### Backend Endpoints

```
POST   /api/import                           # Import novel from URL
POST   /api/cover-image                      # Upload cover image
POST   /api/convert                          # Convert text to hiragana

GET    /api/novels                           # All novels
GET    /api/novels/:id                       # Novel by ID
GET    /api/novels/:id/chapters              # Novel chapters
GET    /api/novels/:id/chapters/:number      # Specific chapter

GET    /health                               # Health check
```

### Example Usage

```javascript
// Import novel
const response = await fetch('http://localhost:3001/api/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com/novel' })
})

// Get all novels
const novels = await fetch('http://localhost:3001/api/novels')
  .then(r => r.json())

// Convert text
const reading = await fetch('http://localhost:3001/api/convert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: '漢字' })
})
```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: Turso (SQLite)
- **Language Processing**: Kuroshiro
- **Web Scraping**: Axios + Cheerio

### Frontend
- **Library**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Runtime**: Browser (JavaScript)

## Database Setup

### Turso Database

1. Create account at [turso.tech](https://turso.tech)
2. Create new database
3. Copy connection string and token
4. Add to `backend/.env.local`:
   ```
   TURSO_DATABASE_URL=<your_url>
   TURSO_AUTH_TOKEN=<your_token>
   ```

## Common Issues

### Backend won't start
```bash
# Check Node version (needs 18+)
node --version

# Check environment variables
cat backend/.env.local

# Verify database credentials
npm run verify
```

### Frontend can't connect to API
```bash
# Check VITE_API_URL in Light/.env.local
cat Light/.env.local

# Test API endpoint
curl http://localhost:3001/health
```

### CORS errors
Make sure backend's `CORS_ORIGIN` includes your frontend URL:
```env
# backend/.env.local
CORS_ORIGIN=http://localhost:5173
```

## Production Checklist

- [ ] Backend deployed to production platform
- [ ] Database credentials set in backend production environment
- [ ] Backend URL set in frontend environment variables
- [ ] Frontend deployed to production
- [ ] CORS_ORIGIN points to frontend domain
- [ ] SSL/HTTPS enabled for both
- [ ] Database backups configured
- [ ] Error logging set up
- [ ] Monitor API health check endpoint

## Next Steps

1. ✅ Separate backend and frontend (Done!)
2. 🔲 Update API calls in React components to use `VITE_API_URL`
3. 🔲 Deploy backend to your chosen platform
4. 🔲 Update `VITE_API_URL` for production
5. 🔲 Deploy frontend to your chosen platform
6. 🔲 Test everything end-to-end

## Support

For deployment help, see:
- Backend: `backend/DEPLOYMENT.md`
- Frontend: `Light/FRONTEND_DEPLOYMENT.md`

For API documentation, check backend routes:
- `backend/routes/novels.js`
- `backend/server.js` (custom endpoints)
