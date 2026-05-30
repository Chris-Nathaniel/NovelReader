# NovelReader - Backend & Frontend Separated ✅

This project is now split into **backend** (Node.js API) and **frontend** (React app) for independent deployment.

## Quick Start (Development)

### Setup
```bash
# Backend
cd backend && npm install

# Frontend  
cd Light && npm install
```

### Run Both
```bash
# Terminal 1 - Backend (API server)
cd backend && npm run dev
# Runs on http://localhost:3001

# Terminal 2 - Frontend (React app)
cd Light && npm run dev
# Runs on http://localhost:5173
```

## Project Structure

```
NovelReader/
├── backend/              # Node.js Express API
│   ├── db/              # Database & migrations
│   ├── routes/          # API endpoints
│   ├── server.js        # Main server
│   └── DEPLOYMENT.md    # Deploy guide
│
├── Light/               # React Frontend
│   ├── src/            # React components
│   └── FRONTEND_DEPLOYMENT.md
│
├── ARCHITECTURE.md      # Full documentation
└── SETUP_COMPLETE.md    # Setup reference
```

## Important Files

| File | Purpose |
|------|---------|
| `backend/.env.local` | Backend config (Turso database) |
| `Light/.env.local` | Frontend config (API URL) |
| `ARCHITECTURE.md` | Full setup & architecture guide |
| `backend/DEPLOYMENT.md` | How to deploy backend |
| `Light/FRONTEND_DEPLOYMENT.md` | How to deploy frontend |

## Configuration

### Backend (`backend/.env.local`)
```env
TURSO_DATABASE_URL=your_database_url
TURSO_AUTH_TOKEN=your_token
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

### Frontend (`Light/.env.local`)
✅ **Already configured to use `http://localhost:3001`**

## What Changed

✅ Backend files moved to `backend/` folder
✅ Frontend dependencies cleaned up (React only)
✅ Separate environment configurations
✅ Can now deploy to any platform (not just Vercel)
✅ Independent scaling possible

## Deployment

1. **Deploy Backend** → Get URL (e.g., `https://api.example.com`)
2. **Set Frontend VITE_API_URL** → Point to backend URL
3. **Deploy Frontend** → Deploy to Vercel, Netlify, etc.

See `backend/DEPLOYMENT.md` and `Light/FRONTEND_DEPLOYMENT.md` for detailed instructions.

## API Endpoints

```
GET    /api/novels                      # All novels
GET    /api/novels/:id                  # Novel details
POST   /api/import                      # Import from URL
POST   /api/cover-image                 # Upload cover
POST   /api/convert                     # Text conversion
GET    /health                          # Health check
```

## Troubleshooting

### Backend won't start
```bash
cd backend
npm run verify  # Check database connection
```

### Frontend can't reach API
```bash
# Check VITE_API_URL in Light/.env.local
cat Light/.env.local
```

### CORS errors
Backend's `CORS_ORIGIN` must match frontend URL.

## Documentation

- **Full Guide**: See `ARCHITECTURE.md`
- **Backend Deployment**: See `backend/DEPLOYMENT.md`
- **Frontend Deployment**: See `Light/FRONTEND_DEPLOYMENT.md`
- **Setup Reference**: See `SETUP_COMPLETE.md`

## Technology

**Backend**: Node.js 18+, Express, Turso Database, Kuroshiro
**Frontend**: React 19, Vite, Tailwind CSS

---

**Ready to deploy?** Start with `backend/DEPLOYMENT.md`
