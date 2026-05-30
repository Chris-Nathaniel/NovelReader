import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import fs from 'fs/promises'
import dotenv from 'dotenv'
import KuroshiroModule from 'kuroshiro'
import KuromojiAnalyzerModule from 'kuroshiro-analyzer-kuromoji'
import { initializeDatabase, setCoverImage, insertNovelWithChapters } from './db/index.js'
import novelRoutes from './routes/novels.js'

// Load environment variables
dotenv.config({ path: '.env.local' })

const getDefaultExport = (module) => module?.default?.default ?? module?.default ?? module
const Kuroshiro = getDefaultExport(KuroshiroModule)
const KuromojiAnalyzer = getDefaultExport(KuromojiAnalyzerModule)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = process.env.PORT || 3001

// CORS configuration - allow your frontend domain
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}))
app.use(express.json({ limit: '20mb' }))

const DATA_DIR = path.resolve(__dirname, 'data')
const COVERS_DIR = path.join(DATA_DIR, 'covers')

// Create covers directory if it doesn't exist
try {
  await fs.mkdir(COVERS_DIR, { recursive: true })
} catch (error) {
  console.error('Failed to create covers directory:', error)
}

app.use('/covers', express.static(COVERS_DIR))

// Mount database routes
app.use('/api', novelRoutes)

let db = null
let kuroshiro = null

// Initialize database
async function initDatabase() {
  try {
    db = await initializeDatabase()
    console.log('✅ Database initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize database:', error)
    process.exit(1)
  }
}

// Initialize Kuroshiro
async function initKuroshiro() {
  try {
    kuroshiro = new Kuroshiro()
    await kuroshiro.init(new KuromojiAnalyzer())
    console.log('✅ Kuroshiro initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize Kuroshiro:', error)
    process.exit(1)
  }
}

function buildPublicUrl(req, relativePath) {
  if (!relativePath) return undefined
  if (/^https?:\/\//i.test(relativePath)) return relativePath
  return `${req.protocol}://${req.get('host')}${relativePath}`
}

// API endpoint for novel import and scraping
app.post('/api/import', async (req, res) => {
  try {
    const { url } = req.body

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'A valid URL is required' })
    }

    const normalizedUrl = url.trim()
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      return res.status(400).json({ error: 'URL must include http:// or https://' })
    }

    const scriptPath = path.resolve(__dirname, 'scrape_chapters.js')
    const scraper = spawn('node', [scriptPath, normalizedUrl], {
      cwd: __dirname,
    })

    let stdout = ''
    let stderr = ''
    let responded = false

    const sendError = (status, payload) => {
      if (responded) return
      responded = true
      res.status(status).json(payload)
    }

    scraper.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    scraper.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    scraper.on('close', async (code) => {
      if (responded) return

      if (code !== 0) {
        console.error('Scraper failed:', stderr)
        return sendError(500, { error: stderr.trim() || 'Failed to import novel' })
      }

      try {
        const novelData = JSON.parse(stdout)

        // Save to database automatically
        try {
          const savedNovel = await insertNovelWithChapters(novelData)
          console.log(`✅ Novel saved to database: ${savedNovel.title}`)

          responded = true
          return res.json({
            ...savedNovel,
            success: true,
            message: 'Novel imported and saved to database',
          })
        } catch (dbError) {
          console.error('Database save error:', dbError)
          responded = true
          return res.json({
            ...novelData,
            warning: 'Novel scraped but database save failed',
            dbError: dbError.message,
          })
        }
      } catch (parseError) {
        console.error('Failed to parse scraper output:', parseError, stdout)
        return sendError(500, { error: 'Failed to parse import result' })
      }
    })

    scraper.on('error', (error) => {
      if (responded) return
      console.error('Failed to start scraper:', error)
      return sendError(500, { error: 'Failed to start scraper process' })
    })
  } catch (error) {
    console.error('Import error:', error)
    res.status(500).json({ error: 'Failed to import novel' })
  }
})

// API endpoint for cover image upload
app.post('/api/cover-image', async (req, res) => {
  try {
    const { id, fileName, fileData } = req.body

    if (!id || !fileName || !fileData) {
      return res.status(400).json({ error: 'id, fileName, and fileData are required' })
    }

    const base64Data =
      typeof fileData === 'string' ? fileData.replace(/^data:.*;base64,/, '') : null
    if (!base64Data) {
      return res.status(400).json({ error: 'Invalid fileData format' })
    }

    // Check for Vercel Blob credentials (optional - for cloud storage)
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (token) {
      // Use Vercel Blob for cloud storage
      try {
        const { put } = await import('@vercel/blob')
        
        const buffer = Buffer.from(base64Data, 'base64')
        const timestamp = Date.now()
        const safeName = `${timestamp}-${path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const blobPath = `covers/${safeName}`

        const blob = await put(blobPath, buffer, {
          access: 'public',
          token: token,
        })

        console.log(`✅ Cover image uploaded to Vercel Blob: ${blob.url}`)
        await setCoverImage(Number(id), blob.url)

        return res.status(201).json({
          id: Number(id),
          coverImagePath: blob.url,
        })
      } catch (blobError) {
        console.error('Failed to upload to Vercel Blob:', blobError)
        return res.status(500).json({ error: 'Failed to upload cover image to storage' })
      }
    } else {
      // Save locally to data/covers directory
      try {
        const buffer = Buffer.from(base64Data, 'base64')
        const timestamp = Date.now()
        const safeName = `${timestamp}-${path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const filePath = path.join(COVERS_DIR, safeName)

        await fs.mkdir(COVERS_DIR, { recursive: true })
        await fs.writeFile(filePath, buffer)

        const coverPath = `/covers/${safeName}`
        console.log(`✅ Cover image saved locally: ${coverPath}`)
        await setCoverImage(Number(id), coverPath)

        return res.status(201).json({
          id: Number(id),
          coverImagePath: coverPath,
        })
      } catch (fileError) {
        console.error('Failed to save cover image locally:', fileError)
        return res.status(500).json({ error: 'Failed to save cover image' })
      }
    }
  } catch (error) {
    console.error('Failed to save cover image:', error)
    res.status(500).json({ error: 'Failed to save cover image' })
  }
})

// API endpoint for text conversion
app.post('/api/convert', async (req, res) => {
  try {
    const { text } = req.body

    if (!text) {
      return res.status(400).json({ error: 'Text is required' })
    }

    if (!kuroshiro) {
      return res.status(503).json({ error: 'Kuroshiro not initialized' })
    }

    const reading = await kuroshiro.convert(text, {
      to: 'hiragana',
      mode: 'furigana',
    })

    res.json({ reading })
  } catch (error) {
    console.error('Conversion error:', error)
    res.status(500).json({ error: 'Failed to convert text' })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    kuroshiroReady: !!kuroshiro,
    databaseReady: !!db,
  })
})

// Start server
async function start() {
  try {
    await initDatabase()
    await initKuroshiro()

    app.listen(port, () => {
      console.log(`\n🚀 API server running on http://localhost:${port}`)
      console.log(`📚 Database connected and ready`)
      console.log(`🎌 Language conversion service ready`)
      console.log(`🔗 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
