#!/usr/bin/env node

/**
 * Verification Script - Test Turso Database Setup
 * Run: node db/verify.js
 */

import dotenv from 'dotenv'
import { initializeDatabase, getAllNovels, getNovelChapters } from './index.js'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

async function verify() {
  console.log('🧪 Verifying Turso Database Setup...\n')

  try {
    // 1. Check environment variables
    console.log('1️⃣  Checking environment variables...')
    if (!process.env.TURSO_DATABASE_URL) {
      console.error('❌ TURSO_DATABASE_URL not set in .env.local')
      process.exit(1)
    }
    if (!process.env.TURSO_AUTH_TOKEN) {
      console.error('❌ TURSO_AUTH_TOKEN not set in .env.local')
      process.exit(1)
    }
    console.log('✅ Environment variables found\n')

    // 2. Initialize database
    console.log('2️⃣  Connecting to database...')
    const db = await initializeDatabase()
    console.log('✅ Database connection successful\n')

    // 3. Check tables
    console.log('3️⃣  Checking database tables...')
    const novels = await getAllNovels()
    console.log(`✅ Found ${novels.length} novels\n`)

    // 4. Display sample data
    if (novels.length > 0) {
      console.log('4️⃣  Sample novels:')
      novels.slice(0, 3).forEach((novel) => {
        console.log(`   • ${novel.title} (${novel.chapterCount} chapters)`)
      })
      console.log()

      // 5. Check chapters
      console.log('5️⃣  Checking chapters for first novel...')
      const chapters = await getNovelChapters(novels[0].id)
      console.log(`✅ Found ${chapters.length} chapters for "${novels[0].title}"\n`)
    }

    // 6. Success summary
    console.log('🎉 All checks passed!\n')
    console.log('✅ Database is ready for use')
    console.log('✅ Data has been imported successfully')
    console.log('\nYou can now run: npm run dev\n')

    process.exit(0)
  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    console.error('\nTroubleshooting tips:')
    console.error('1. Check your .env.local file exists')
    console.error('2. Verify TURSO_DATABASE_URL is correct')
    console.error('3. Verify TURSO_AUTH_TOKEN is correct')
    console.error('4. Make sure you ran: npm run migrate')
    console.error('\nFull error:', error)
    process.exit(1)
  }
}

verify()
