# Turso SQLite Database Setup Guide

This guide will help you set up Turso SQLite database and integrate it with your NovelReader application for deployment on Vercel.

## Prerequisites

- Turso account (https://turso.tech)
- Node.js environment (already set up)
- Vercel account for deployment

## Step 1: Create a Turso Database

1. Go to [Turso Dashboard](https://app.turso.tech)
2. Click "Create a database"
3. Name your database (e.g., `novelreader`)
4. Select a location (choose the closest region)
5. Click "Create"

## Step 2: Get Your Database Credentials

After creating your database:

1. Click on your database name
2. Copy:
   - **Database URL** (looks like: `libsql://your-db-name-XXXXXX.turso.io`)
   - **Auth Token** (click on tokens/settings icon)

## Step 3: Set Up Local Environment

### 3a. Create `.env.local` file

In your `Light/` directory, create a `.env.local` file:

```bash
cd Light
```

Create `.env.local`:

```
TURSO_DATABASE_URL=libsql://your-database-name-XXXXXX.turso.io
TURSO_AUTH_TOKEN=your_auth_token_here
VITE_API_URL=http://localhost:3001/api
```

Replace the placeholder values with your actual Turso credentials.

### 3b. Install Dependencies

```bash
npm install
```

This will install `@libsql/client` and other required packages.

## Step 4: Run Database Migrations

The migration script will:
- Create the database schema (novels, chapters, coverImages tables)
- Import your existing JSON data to Turso

```bash
node db/migrate.js
```

You should see output like:
```
✅ Database initialized
📚 Importing novels... ✅ Imported 7 novels
📖 Importing chapters... ✅ Imported 1000+ chapters
🖼️  Importing cover images... ✅ Imported 7 cover images
🎉 Migration completed successfully!
```

## Step 5: Test Locally

Start your development server:

```bash
npm run dev:full
```

Your app should now:
- Use Turso database instead of JSON files
- Show data from the database
- Work exactly as before

Test that data loads properly:
- Visit `http://localhost:3001/api/novels` to see all novels
- Visit `http://localhost:3001/api/novels/1` to see a specific novel
- Check `/health` endpoint to confirm database is connected

## Step 6: Deploy to Vercel

### 6a. Set Environment Variables in Vercel

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add:
   - `TURSO_DATABASE_URL` = Your database URL
   - `TURSO_AUTH_TOKEN` = Your auth token

### 6b. Update Vercel Configuration (if needed)

For the backend/API, you might need to create a `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev:full",
  "functions": {
    "routes/*.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  }
}
```

### 6c. Deploy

```bash
vercel deploy --prod
```

## Database Schema

Your database has three main tables:

### novels table
- `id` - Integer (primary key)
- `title` - Text
- `author` - Text
- `description` - Text
- `chapterCount` - Integer
- `fileName` - Text
- `status` - Text (reading/completed/paused)
- `createdAt` - DateTime
- `updatedAt` - DateTime

### chapters table
- `id` - Integer (auto-increment)
- `novelId` - Integer (foreign key)
- `chapterNumber` - Integer
- `title` - Text
- `section` - Text
- `content` - Text (HTML)
- `contentText` - Text (plain text)
- `createdAt` - DateTime
- `updatedAt` - DateTime

### coverImages table
- `id` - Integer (auto-increment)
- `novelId` - Integer (foreign key, unique)
- `coverImagePath` - Text
- `createdAt` - DateTime
- `updatedAt` - DateTime

## API Endpoints

All endpoints use `/api/` prefix and return JSON.

### GET /api/novels
Get all novels

```bash
curl http://localhost:3001/api/novels
```

### GET /api/novels/:id
Get a specific novel

```bash
curl http://localhost:3001/api/novels/1
```

### GET /api/novels/:id/chapters
Get all chapters for a novel

```bash
curl http://localhost:3001/api/novels/1/chapters
```

### GET /api/novels/:id/chapters/:chapterNumber
Get a specific chapter

```bash
curl http://localhost:3001/api/novels/1/chapters/1
```

### POST /api/novels/:id/chapters
Add a new chapter

```bash
curl -X POST http://localhost:3001/api/novels/1/chapters \
  -H "Content-Type: application/json" \
  -d '{
    "chapterNumber": 5,
    "title": "Chapter Title",
    "section": "Section Name",
    "content": "<p>HTML content</p>",
    "contentText": "Plain text content"
  }'
```

## Troubleshooting

### Database Connection Error
- ✅ Check `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env.local`
- ✅ Make sure they're exactly correct (no extra spaces)
- ✅ Verify database exists in Turso dashboard

### Migration Failed
- ✅ Check that environment variables are set
- ✅ Run `node db/migrate.js` again
- ✅ Check terminal for specific error messages

### "Table already exists" error
- ✅ This is normal if you run migration twice - tables won't be recreated
- ✅ If you need to reset, delete the database in Turso and create a new one

### Data not showing after migration
- ✅ Verify novel files exist in `data/novels/` directory
- ✅ Check migration output for any errors
- ✅ Query the database directly: `/api/novels`

## Next Steps

1. **Update Frontend** - Ensure React components fetch from `/api/novels` instead of local JSON
2. **Update Scraper** - The scraper still saves to JSON, but migration handles it
3. **Monitor Performance** - Check Vercel logs and Turso dashboard for any issues
4. **Backup Data** - Export your Turso data regularly using their CLI

## Files Created/Modified

- ✅ `db/schema.sql` - Database schema
- ✅ `db/index.js` - Database utilities and functions
- ✅ `db/migrate.js` - Migration script (run this!)
- ✅ `routes/novels.js` - API endpoints
- ✅ `server.js` - Updated to use database
- ✅ `package.json` - Added `@libsql/client`
- ✅ `.env.example` - Environment variables template
- ✅ `.env.local` - YOUR environment (created manually)

## Support

- Turso Docs: https://docs.turso.tech
- LibSQL Client: https://github.com/tursodatabase/libsql-client-js
- Issues? Check the error messages and Turso dashboard
