# Quick Start - Turso Setup Checklist

## ⚡ 5-Minute Setup

### 1. Create Turso Database (2 min)
```bash
# Go to https://app.turso.tech
# 1. Click "Create Database"
# 2. Name it: novelreader
# 3. Select region
# 4. Copy the Database URL
# 5. Generate and copy Auth Token
```

### 2. Create `.env.local` File (1 min)

In your `Light/` folder, create `.env.local`:

```
TURSO_DATABASE_URL=libsql://your-db-XXXXXX.turso.io
TURSO_AUTH_TOKEN=your_token_here
VITE_API_URL=http://localhost:3001/api
```

### 3. Install & Migrate (2 min)

```bash
cd Light
npm install
npm run migrate
```

### 4. Run Locally

```bash
npm run dev:full
```

Visit: `http://localhost:3001/api/novels` ✅

---

## 🚀 Deploy to Vercel

### Before deploying:

1. **Test locally first**
   ```bash
   npm run dev:full
   # Check if app works
   ```

2. **Add to Vercel** (Settings → Environment Variables)
   ```
   TURSO_DATABASE_URL = your_url
   TURSO_AUTH_TOKEN = your_token
   ```

3. **Deploy**
   ```bash
   vercel deploy --prod
   ```

---

## 📊 Verify It Works

### Local
```bash
curl http://localhost:3001/api/novels
curl http://localhost:3001/api/novels/1
curl http://localhost:3001/api/novels/1/chapters
```

### After Vercel Deploy
```bash
curl https://your-vercel-url.vercel.app/api/novels
```

---

## ❓ Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Database not initialized" | Check `.env.local` has correct URL & token |
| "No tables exist" | Run `npm run migrate` again |
| "Authorization failed" | Copy token again from Turso dashboard |
| Data not importing | Check `data/novels/` folder has JSON files |
| Vercel deploy fails | Add env vars to Vercel Settings → Environment Variables |

---

## 📁 What Was Created

```
Light/
├── db/
│   ├── schema.sql          ← Database structure
│   ├── index.js            ← Database functions
│   └── migrate.js          ← Run this to import data
├── routes/
│   └── novels.js           ← API endpoints
├── .env.example            ← Template (create .env.local from this)
├── TURSO_SETUP.md          ← Full documentation
└── package.json            ← Added @libsql/client
```

---

## 🔗 Useful Links

- **Turso Dashboard**: https://app.turso.tech
- **Full Setup Guide**: See `TURSO_SETUP.md`
- **Vercel Docs**: https://vercel.com/docs
- **LibSQL Docs**: https://docs.turso.tech/sdk/ts/index

---

## 📝 Next Steps

- [ ] Create Turso database
- [ ] Copy credentials to `.env.local`
- [ ] Run `npm install`
- [ ] Run `npm run migrate`
- [ ] Test with `npm run dev:full`
- [ ] Add env vars to Vercel
- [ ] Deploy with `vercel deploy --prod`

Done! 🎉
