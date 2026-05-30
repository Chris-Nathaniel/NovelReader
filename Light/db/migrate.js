/**
 * Migration script: Import existing JSON data to Turso database
 * Run this after setting up Turso: node db/migrate.js
 */

import dotenv from 'dotenv'
import { initializeDatabase } from './index.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function migrateData() {
  try {
    console.log('🚀 Starting migration from JSON to Turso...\n')

    // Initialize database and run migrations
    const db = await initializeDatabase()
    console.log('✅ Database initialized\n')

    const DATA_DIR = path.resolve(__dirname, '..', 'data')
    const DATA_FILE = path.join(DATA_DIR, 'novels.json')
    const CHAPTERS_DATA_FILE = path.join(DATA_DIR, 'novelchapters.json')
    const COVER_IMAGES_FILE = path.join(DATA_DIR, 'coverImage.json')

    // 1. Import novels
    console.log('📚 Importing novels...')
    const novelData = await fs.readFile(DATA_FILE, 'utf8')
    const novels = JSON.parse(novelData)

    for (const novel of novels) {
      await db.execute(
        `INSERT OR REPLACE INTO novels (id, title, author, description, chapterCount, fileName, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          novel.id,
          novel.title || '',
          novel.author || '',
          novel.description || '',
          novel.chapterCount || 0,
          novel.fileName || '',
          novel.status || 'reading',
        ]
      )
    }
    console.log(`✅ Imported ${novels.length} novels\n`)

    // 2. Import chapters
    console.log('📖 Importing chapters...')
    const chaptersData = await fs.readFile(CHAPTERS_DATA_FILE, 'utf8')
    const chaptersArray = JSON.parse(chaptersData)

    let totalChapters = 0
    for (const novelChapters of chaptersArray) {
      const chapters = novelChapters.chapters || []
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i]
        await db.execute(
          `INSERT OR REPLACE INTO chapters (novelId, chapterNumber, title, section, content, contentText) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            novelChapters.id,
            i + 1,
            chapter.title || '',
            chapter.section || '',
            chapter.content || '',
            chapter.content_text || '',
          ]
        )
        totalChapters++
      }
    }
    console.log(`✅ Imported ${totalChapters} chapters\n`)

    // 3. Import cover images
    console.log('🖼️  Importing cover images...')
    try {
      const coverImagesData = await fs.readFile(COVER_IMAGES_FILE, 'utf8')
      const coverImages = JSON.parse(coverImagesData)

      for (const mapping of coverImages) {
        await db.execute(
          'INSERT OR REPLACE INTO coverImages (novelId, coverImagePath) VALUES (?, ?)',
          [mapping.id, mapping.coverImagePath || '']
        )
      }
      console.log(`✅ Imported ${coverImages.length} cover images\n`)
    } catch (error) {
      console.log('⚠️  No cover images to import\n')
    }

    console.log('🎉 Migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Verify data in your Turso dashboard')
    console.log(
      '2. Update your API endpoints to use the database functions'
    )
    console.log('3. Test the application locally')
    console.log('4. Deploy to Vercel')

    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrateData()
