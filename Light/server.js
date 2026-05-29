import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import fs from 'fs/promises'
import KuroshiroModule from 'kuroshiro'
import KuromojiAnalyzerModule from 'kuroshiro-analyzer-kuromoji'

const getDefaultExport = (module) => module?.default?.default ?? module?.default ?? module
const Kuroshiro = getDefaultExport(KuroshiroModule)
const KuromojiAnalyzer = getDefaultExport(KuromojiAnalyzerModule)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = 3001

app.use(cors())
app.use(express.json({ limit: '20mb' }))

const DATA_DIR = path.resolve(__dirname, 'data')
const NOVELS_DATA_DIR = path.join(DATA_DIR, 'novels')
const COVERS_DIR = path.join(DATA_DIR, 'covers')
const COVER_IMAGES_FILE = path.join(DATA_DIR, 'coverImage.json')
const DATA_FILE = path.join(DATA_DIR, 'novels.json')
const CHAPTERS_DATA_FILE = path.join(DATA_DIR, 'novelchapters.json')

app.use('/covers', express.static(COVERS_DIR))

async function ensureDataStore() {
  await fs.mkdir(NOVELS_DATA_DIR, { recursive: true })
  await fs.mkdir(COVERS_DIR, { recursive: true })
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf8')
  }
  try {
    await fs.access(CHAPTERS_DATA_FILE)
  } catch {
    await fs.writeFile(CHAPTERS_DATA_FILE, '[]', 'utf8')
  }
  try {
    await fs.access(COVER_IMAGES_FILE)
  } catch {
    await fs.writeFile(COVER_IMAGES_FILE, '[]', 'utf8')
  }
}

function normalizeNovelEntry(data, fileName, fallbackId, existing = {}) {
  const chapters = Array.isArray(data.chapters) ? data.chapters : []
  const id = data.id ?? fallbackId
  return {
    ...existing,
    id,
    title: data.title || existing.title || '',
    author: data.author || existing.author || '',
    description: data.description || existing.description || '',
    chapterCount: typeof data.chapterCount === 'number' ? data.chapterCount : chapters.length,
    fileName,
    status: data.status ?? existing.status ?? 'reading',
  }
}

async function readStoredNovels() {
  await ensureDataStore()
  const raw = await fs.readFile(DATA_FILE, 'utf8')
  try {
    const novels = JSON.parse(raw)
    if (!Array.isArray(novels)) return []
    return novels.map(({ chapters, ...rest }) => rest)
  } catch {
    return []
  }
}

async function writeStoredNovels(novels) {
  await ensureDataStore()
  await fs.writeFile(DATA_FILE, JSON.stringify(novels, null, 2), 'utf8')
}

async function readCoverImageMappings() {
  await ensureDataStore()
  try {
    const raw = await fs.readFile(COVER_IMAGES_FILE, 'utf8')
    const mappings = JSON.parse(raw)
    return Array.isArray(mappings) ? mappings : []
  } catch {
    return []
  }
}

async function writeCoverImageMappings(mappings) {
  await ensureDataStore()
  await fs.writeFile(COVER_IMAGES_FILE, JSON.stringify(mappings, null, 2), 'utf8')
}

async function readStoredNovelChapters() {
  await ensureDataStore()
  try {
    const raw = await fs.readFile(CHAPTERS_DATA_FILE, 'utf8')
    const chapters = JSON.parse(raw)
    return Array.isArray(chapters) ? chapters : []
  } catch {
    return []
  }
}

async function writeStoredNovelChapters(chapters) {
  await ensureDataStore()
  await fs.writeFile(CHAPTERS_DATA_FILE, JSON.stringify(chapters, null, 2), 'utf8')
}

async function getStoredNovelChapters(novelId) {
  const chapters = await readStoredNovelChapters()
  const entry = chapters.find((item) => Number(item.id) === Number(novelId))
  return Array.isArray(entry?.chapters) ? entry.chapters : []
}

async function saveStoredNovelChapters(novelId, chapters) {
  const chaptersData = await readStoredNovelChapters()
  const existing = chaptersData.find((item) => Number(item.id) === Number(novelId))
  if (existing) {
    existing.chapters = chapters
  } else {
    chaptersData.push({ id: Number(novelId), chapters })
  }
  await writeStoredNovelChapters(chaptersData)
}

async function readNovelFileChapters(fileName) {
  if (!fileName) return []
  try {
    const raw = await fs.readFile(path.join(NOVELS_DATA_DIR, fileName), 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data.chapters) ? data.chapters : []
  } catch {
    return []
  }
}

async function setCoverImageMapping(novelId, coverImagePath) {
  const mappings = await readCoverImageMappings()
  const existing = mappings.find((entry) => Number(entry.id) === Number(novelId))
  if (existing) {
    existing.coverImagePath = coverImagePath
  } else {
    mappings.push({ id: Number(novelId), coverImagePath })
  }
  await writeCoverImageMappings(mappings)
  return mappings
}

function buildPublicUrl(req, relativePath) {
  if (!relativePath) return undefined
  if (/^https?:\/\//i.test(relativePath)) return relativePath
  return `${req.protocol}://${req.get('host')}${relativePath}`
}

async function attachCoverImages(novels, req) {
  const mappings = await readCoverImageMappings()
  return novels.map((novel) => {
    const mapping = mappings.find((entry) => Number(entry.id) === Number(novel.id))
    return mapping ? { ...novel, coverImage: buildPublicUrl(req, mapping.coverImagePath) } : novel
  })
}

async function syncStoredNovels() {
  await ensureDataStore()
  const existingNovels = await readStoredNovels()
  const existingChapters = await readStoredNovelChapters()
  const chapterMap = new Map(existingChapters.map((entry) => [Number(entry.id), entry.chapters || []]))
  const entries = await fs.readdir(NOVELS_DATA_DIR, { withFileTypes: true })
  const novels = []

  for (const [index, entry] of entries.entries()) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const filePath = path.join(NOVELS_DATA_DIR, entry.name)
    try {
      const raw = await fs.readFile(filePath, 'utf8')
      const data = JSON.parse(raw)
      if (data && typeof data === 'object') {
        const fallbackId = index + 1
        const existing = existingNovels.find(
          (item) => item.id === data.id || item.fileName === entry.name,
        )
        const normalized = normalizeNovelEntry(data, entry.name, fallbackId, existing)
        if (Array.isArray(data.chapters) && data.chapters.length > 0) {
          chapterMap.set(Number(normalized.id), data.chapters)
        }
        novels.push(normalized)
      }
    } catch (error) {
      console.error(`Failed to read novel file ${entry.name}:`, error)
    }
  }

  await writeStoredNovels(novels)
  await writeStoredNovelChapters(
    [...chapterMap.entries()].map(([id, chapters]) => ({ id, chapters })),
  )
  return novels
}

async function addNovelToStorage(novel) {
  const novels = await readStoredNovels()
  const nextId = novels.length ? Math.max(...novels.map((item) => Number(item.id) || 0)) + 1 : 1
  const chapters = Array.isArray(novel.chapters) ? novel.chapters : []
  const savedNovel = { ...novel, id: novel.id ?? nextId }
  delete savedNovel.chapters
  novels.push(savedNovel)
  await writeStoredNovels(novels)
  if (chapters.length > 0) {
    await saveStoredNovelChapters(savedNovel.id, chapters)
  }
  return savedNovel
}

let kuroshiro = null

// Initialize Kuroshiro on startup
async function initKuroshiro() {
  try {
    kuroshiro = new Kuroshiro()
    await kuroshiro.init(new KuromojiAnalyzer())
    console.log('Kuroshiro initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Kuroshiro:', error)
    process.exit(1)
  }
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
    const python = process.env.PYTHON || 'python'
    const outputDir = NOVELS_DATA_DIR
    const scraper = spawn(python, [scriptPath, normalizedUrl, '--output-dir', outputDir], {
      cwd: path.resolve(__dirname, '..'),
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

    scraper.on('close', (code) => {
      if (responded) return

      if (code !== 0) {
        console.error('Scraper failed:', stderr)
        return sendError(500, { error: stderr.trim() || 'Failed to import novel' })
      }

      try {
        const novelData = JSON.parse(stdout)
        responded = true
        return res.json(novelData)
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

// API endpoint for import with progress streaming
app.get('/api/import-stream', (req, res) => {
  try {
    const { url } = req.query

    if (!url || typeof url !== 'string') {
      res.setHeader('Content-Type', 'text/event-stream;charset=utf-8')
      res.write('event: error\ndata: A valid URL is required\n\n')
      res.write('event: done\ndata: null\n\n')
      return res.end()
    }

    const normalizedUrl = url.trim()
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      res.setHeader('Content-Type', 'text/event-stream;charset=utf-8')
      res.write('event: error\ndata: URL must include http:// or https://\n\n')
      res.write('event: done\ndata: null\n\n')
      return res.end()
    }

    const scriptPath = path.resolve(__dirname, '..', 'scrape_chapters.py')
    const python = process.env.PYTHON || 'python'
    const outputDir = NOVELS_DATA_DIR
    const scraper = spawn(python, [scriptPath, normalizedUrl, '--output-dir', outputDir], {
      cwd: path.resolve(__dirname, '..'),
    })

    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Content-Type', 'text/event-stream;charset=utf-8')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const sendEvent = (event, payload) => {
      let formatted = typeof payload === 'string' ? payload : JSON.stringify(payload)
      formatted = formatted.replace(/\r/g, '')
      formatted.split('\n').forEach((line) => {
        res.write(`event: ${event}\ndata: ${line}\n`)
      })
      res.write('\n')
    }

    let stdout = ''
    let stderr = ''

    scraper.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    scraper.stderr.on('data', (chunk) => {
      const text = chunk.toString().replace(/\r/g, '')
      text.split('\n').filter(Boolean).forEach((line) => {
        sendEvent('log', line)
      })
      stderr += text
    })

    scraper.on('close', (code) => {
      if (code !== 0) {
        sendEvent('error', stderr.trim() || 'Failed to import novel')
        res.write('event: done\ndata: null\n\n')
        return res.end()
      }

      try {
        const novelData = JSON.parse(stdout)
        sendEvent('done', novelData)
      } catch (parseError) {
        sendEvent('error', 'Failed to parse import result')
      }

      res.end()
    })

    scraper.on('error', (error) => {
      sendEvent('error', 'Failed to start scraper process')
      res.write('event: done\ndata: null\n\n')
      res.end()
    })
  } catch (error) {
    res.setHeader('Content-Type', 'text/event-stream;charset=utf-8')
    res.write(`event: error\ndata: ${error.message}\n\n`)
    res.write('event: done\ndata: null\n\n')
    res.end()
  }
})

// API endpoint for listing stored novels
app.get('/api/novels', async (req, res) => {
  try {
    const novels = await readStoredNovels()
    const novelsWithCovers = await attachCoverImages(novels, req)
    return res.json(novelsWithCovers)
  } catch (error) {
    console.error('Failed to load novels:', error)
    return res.status(500).json({ error: 'Failed to load novels' })
  }
})

// API endpoint for refreshing stored novel metadata from the file store
app.get('/api/novels/refresh', async (req, res) => {
  try {
    const novels = await syncStoredNovels()
    const novelsWithCovers = await attachCoverImages(novels, req)
    return res.json(novelsWithCovers)
  } catch (error) {
    console.error('Failed to refresh novels:', error)
    return res.status(500).json({ error: 'Failed to refresh novels' })
  }
})

// API endpoint for reading one novel with full chapter list
app.get('/api/novels/:id', async (req, res) => {
  try {
    const novels = await readStoredNovels()
    const novelId = Number(req.params.id)
    const novel = novels.find((item) => item.id === novelId)
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' })
    }

    let chapters = await getStoredNovelChapters(novelId)
    if (chapters.length === 0 && novel.fileName) {
      chapters = await readNovelFileChapters(novel.fileName)
      if (chapters.length > 0) {
        await saveStoredNovelChapters(novelId, chapters)
      }
    }

    const [novelWithCover] = await attachCoverImages([novel], req)
    return res.json({ ...novelWithCover, chapters })
  } catch (error) {
    console.error('Failed to load novel:', error)
    return res.status(500).json({ error: 'Failed to load novel' })
  }
})

app.post('/api/cover-image', async (req, res) => {
  try {
    const { id, fileName, fileData } = req.body

    if (!id || !fileName || !fileData) {
      return res.status(400).json({ error: 'id, fileName, and fileData are required' })
    }

    const base64Data = typeof fileData === 'string' ? fileData.replace(/^data:.*;base64,/, '') : null
    if (!base64Data) {
      return res.status(400).json({ error: 'Invalid fileData format' })
    }

    const buffer = Buffer.from(base64Data, 'base64')
    const safeName = `${Date.now()}-${path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const filePath = path.join(COVERS_DIR, safeName)

    await fs.writeFile(filePath, buffer)
    const publicPath = `/covers/${safeName}`
    await setCoverImageMapping(id, publicPath)

    return res.status(201).json({ id: Number(id), coverImagePath: buildPublicUrl(req, publicPath) })
  } catch (error) {
    console.error('Failed to save cover image:', error)
    return res.status(500).json({ error: 'Failed to save cover image' })
  }
})

// API endpoint for saving a novel record
app.post('/api/novels', async (req, res) => {
  try {
    const novel = req.body
    if (!novel || !novel.title) {
      return res.status(400).json({ error: 'A valid novel payload is required' })
    }

    const savedNovel = await addNovelToStorage(novel)
    return res.status(201).json(savedNovel)
  } catch (error) {
    console.error('Failed to save novel:', error)
    return res.status(500).json({ error: 'Failed to save novel' })
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
  res.json({ status: 'ok', kuroshiroReady: !!kuroshiro })
})

initKuroshiro().then(async () => {
  try {
    await syncStoredNovels()
  } catch (error) {
    console.error('Failed to sync novel files on startup:', error)
  }

  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`)
  })
})
