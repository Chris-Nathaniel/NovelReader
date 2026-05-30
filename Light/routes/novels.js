import express from 'express'
import {
  getAllNovels,
  getNovelById,
  getNovelChapters,
  getChapterByNumber,
  getCoverImage,
  setCoverImage,
  insertChapter,
  insertMultipleChapters,
} from '../db/index.js'

const router = express.Router()

// Helper function to build full cover image URLs
function buildCoverUrl(req, coverImagePath) {
  if (!coverImagePath) return null
  if (/^https?:\/\//i.test(coverImagePath)) return coverImagePath
  return `${req.protocol}://${req.get('host')}${coverImagePath}`
}

/**
 * GET /api/novels
 * Get all novels with cover images
 */
router.get('/novels', async (req, res) => {
  try {
    const novels = await getAllNovels()
    
    // Fetch cover images for all novels
    const novelsWithCovers = await Promise.all(
      novels.map(async (novel) => {
        const coverImage = await getCoverImage(novel.id)
        return {
          ...novel,
          coverImage: buildCoverUrl(req, coverImage?.coverImagePath),
        }
      })
    )
    
    res.json(novelsWithCovers)
  } catch (error) {
    console.error('Error fetching novels:', error)
    res.status(500).json({ error: 'Failed to fetch novels' })
  }
})

/**
 * GET /api/novels/:id
 * Get a specific novel by ID with its chapters and cover image
 */
router.get('/novels/:id', async (req, res) => {
  try {
    const { id } = req.params
    const novel = await getNovelById(parseInt(id))

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' })
    }

    // Fetch chapters for this novel
    const chapters = await getNovelChapters(parseInt(id))

    // Fetch cover image for this novel
    const coverImage = await getCoverImage(parseInt(id))

    // Return novel with chapters and cover image attached
    res.json({
      ...novel,
      chapters: chapters || [],
      coverImage: buildCoverUrl(req, coverImage?.coverImagePath),
    })
  } catch (error) {
    console.error('Error fetching novel:', error)
    res.status(500).json({ error: 'Failed to fetch novel' })
  }
})

/**
 * GET /api/novels/:id/chapters
 * Get all chapters for a novel
 */
router.get('/novels/:id/chapters', async (req, res) => {
  try {
    const { id } = req.params
    const chapters = await getNovelChapters(parseInt(id))

    res.json(chapters)
  } catch (error) {
    console.error('Error fetching chapters:', error)
    res.status(500).json({ error: 'Failed to fetch chapters' })
  }
})

/**
 * GET /api/novels/:id/chapters/:chapterNumber
 * Get a specific chapter
 */
router.get('/novels/:id/chapters/:chapterNumber', async (req, res) => {
  try {
    const { id, chapterNumber } = req.params
    const chapter = await getChapterByNumber(
      parseInt(id),
      parseInt(chapterNumber)
    )

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' })
    }

    res.json(chapter)
  } catch (error) {
    console.error('Error fetching chapter:', error)
    res.status(500).json({ error: 'Failed to fetch chapter' })
  }
})

/**
 * GET /api/novels/:id/cover
 * Get cover image for a novel
 */
router.get('/novels/:id/cover', async (req, res) => {
  try {
    const { id } = req.params
    const coverImage = await getCoverImage(parseInt(id))

    if (!coverImage) {
      return res.status(404).json({ error: 'Cover image not found' })
    }

    res.json(coverImage)
  } catch (error) {
    console.error('Error fetching cover image:', error)
    res.status(500).json({ error: 'Failed to fetch cover image' })
  }
})

/**
 * POST /api/novels/:id/cover
 * Set cover image for a novel
 */
router.post('/novels/:id/cover', async (req, res) => {
  try {
    const { id } = req.params
    const { coverImagePath } = req.body

    if (!coverImagePath) {
      return res.status(400).json({ error: 'coverImagePath is required' })
    }

    await setCoverImage(parseInt(id), coverImagePath)
    res.json({ success: true, message: 'Cover image set' })
  } catch (error) {
    console.error('Error setting cover image:', error)
    res.status(500).json({ error: 'Failed to set cover image' })
  }
})

/**
 * POST /api/novels/:id/chapters
 * Add a single chapter
 */
router.post('/novels/:id/chapters', async (req, res) => {
  try {
    const { id } = req.params
    const { chapterNumber, title, section, content, contentText } = req.body

    if (!chapterNumber || !title) {
      return res
        .status(400)
        .json({ error: 'chapterNumber and title are required' })
    }

    await insertChapter(parseInt(id), {
      chapterNumber,
      title,
      section: section || '',
      content: content || '',
      contentText: contentText || '',
    })

    res.json({ success: true, message: 'Chapter added' })
  } catch (error) {
    console.error('Error adding chapter:', error)
    res.status(500).json({ error: 'Failed to add chapter' })
  }
})

/**
 * POST /api/novels/:id/chapters/batch
 * Add multiple chapters at once
 */
router.post('/novels/:id/chapters/batch', async (req, res) => {
  try {
    const { id } = req.params
    const { chapters } = req.body

    if (!Array.isArray(chapters)) {
      return res.status(400).json({ error: 'chapters must be an array' })
    }

    await insertMultipleChapters(parseInt(id), chapters)

    res.json({
      success: true,
      message: `Added ${chapters.length} chapters`,
    })
  } catch (error) {
    console.error('Error adding chapters:', error)
    res.status(500).json({ error: 'Failed to add chapters' })
  }
})

export default router
