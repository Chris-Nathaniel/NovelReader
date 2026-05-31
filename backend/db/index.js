import { createClient } from '@libsql/client'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Initialize Turso client
let client = null

export async function initializeDatabase() {
  if (client) return client

  const dbUrl = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!dbUrl || !authToken) {
    throw new Error(
      'Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables'
    )
  }

  client = createClient({
    url: dbUrl,
    authToken: authToken,
  })

  // Run migrations
  await runMigrations()

  return client
}

export function getClient() {
  if (!client) {
    throw new Error('Database not initialized. Call initializeDatabase first.')
  }
  return client
}

async function runMigrations() {
  try {
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql')
    const schema = await fs.readFile(schemaPath, 'utf8')

    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0)

    for (const statement of statements) {
      await client.execute(statement)
    }

    console.log('✅ Database migrations completed')
  } catch (error) {
    console.error('❌ Migration error:', error)
    throw error
  }
}

// Helper functions for common queries
export async function getAllNovels() {
  const result = await client.execute(
    'SELECT * FROM novels ORDER BY createdAt DESC'
  )
  return result.rows || []
}

export async function getNovelById(id) {
  const result = await client.execute('SELECT * FROM novels WHERE id = ?', [id])
  return result.rows?.[0] || null
}

export async function insertNovel(novelData) {
  const { id, title, author, description, chapterCount, fileName, status } =
    novelData
  const result = await client.execute(
    `INSERT INTO novels (id, title, author, description, chapterCount, fileName, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, title, author, description, chapterCount, fileName, status]
  )
  return result
}

export async function updateNovel(id, novelData) {
  const { title, author, description, chapterCount, status } = novelData
  const result = await client.execute(
    `UPDATE novels SET title = ?, author = ?, description = ?, chapterCount = ?, status = ?, updatedAt = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [title, author, description, chapterCount, status, id]
  )
  return result
}

export async function getNovelChapters(novelId) {
  const result = await client.execute(
    'SELECT id, novelId, chapterNumber, title, section, createdAt FROM chapters WHERE novelId = ? ORDER BY chapterNumber ASC',
    [novelId]
  )
  return result.rows || []
}

export async function getChapterByNumber(novelId, chapterNumber) {
  const result = await client.execute(
    'SELECT * FROM chapters WHERE novelId = ? AND chapterNumber = ?',
    [novelId, chapterNumber]
  )
  return result.rows?.[0] || null
}

export async function getChapterById(chapterId) {
  const result = await client.execute(
    'SELECT * FROM chapters WHERE id = ?',
    [chapterId]
  )
  return result.rows?.[0] || null
}

export async function insertChapter(novelId, chapterData) {
  const {
    chapterNumber,
    title,
    section,
    content,
    contentText,
  } = chapterData
  const result = await client.execute(
    `INSERT INTO chapters (novelId, chapterNumber, title, section, content, contentText) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [novelId, chapterNumber, title, section, content, contentText]
  )
  return result
}

export async function insertMultipleChapters(novelId, chapters) {
  for (const chapter of chapters) {
    await insertChapter(novelId, chapter)
  }
}

export async function insertNovelWithChapters(novelData) {
  const { title, author, description, chapters = [] } = novelData

  // Generate an ID based on current timestamp
  const id = Math.floor(Date.now() / 1000)

  // Insert novel
  await client.execute(
    `INSERT INTO novels (id, title, author, description, chapterCount) 
     VALUES (?, ?, ?, ?, ?)`,
    [id, title, author, description, chapters.length]
  )

  // Insert chapters
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i]
    await client.execute(
      `INSERT INTO chapters (novelId, chapterNumber, title, section, content, contentText) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        i + 1,
        chapter.title || '',
        chapter.section || '',
        chapter.content || '',
        chapter.content_text || '',
      ]
    )
  }

  return { id, title, author, description, chapterCount: chapters.length }
}

export async function getCoverImage(novelId) {
  const result = await client.execute(
    'SELECT * FROM coverImages WHERE novelId = ?',
    [novelId]
  )
  return result.rows?.[0] || null
}

export async function setCoverImage(novelId, coverImagePath) {
  const existing = await getCoverImage(novelId)
  if (existing) {
    const result = await client.execute(
      'UPDATE coverImages SET coverImagePath = ?, updatedAt = CURRENT_TIMESTAMP WHERE novelId = ?',
      [coverImagePath, novelId]
    )
    return result
  } else {
    const result = await client.execute(
      'INSERT INTO coverImages (novelId, coverImagePath) VALUES (?, ?)',
      [novelId, coverImagePath]
    )
    return result
  }
}

export default {
  initializeDatabase,
  getClient,
  getAllNovels,
  getNovelById,
  insertNovel,
  updateNovel,
  getNovelChapters,
  getChapterByNumber,
  insertChapter,
  insertMultipleChapters,
  getCoverImage,
  setCoverImage,
}
