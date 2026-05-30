import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import tensuraCover from './assets/tensuracover.jpg'
import icon from './assets/icon.jpg'
import './App.css'

const tabs = [
  { id: 'home', label: 'Home' },
  { id: 'catalogue', label: 'Catalogue' },
  { id: 'completed', label: 'Completed' },
  { id: 'reading', label: 'Reading' },
]

const API_BASE = 'http://localhost:3001'

const fetchStoredNovels = async () => {
  const response = await fetch(`${API_BASE}/api/novels`)
  if (!response.ok) {
    throw new Error(`Failed to load novels: ${response.status}`)
  }
  return response.json()
}

const fetchNovelDetails = async (novelId) => {
  const response = await fetch(`${API_BASE}/api/novels/${novelId}`)
  if (!response.ok) {
    throw new Error(`Failed to load novel details: ${response.status}`)
  }
  return response.json()
}

const saveNovelToBackend = async (novel) => {
  const response = await fetch(`${API_BASE}/api/novels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(novel),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.error || 'Failed to save novel')
  }
  return response.json()
}

function App() {
  const [page, setPage] = useState('home')
  const [novels, setNovels] = useState([])
  const [importUrl, setImportUrl] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [importError, setImportError] = useState('')
  const [importLog, setImportLog] = useState([])
  const [importCoverPreview, setImportCoverPreview] = useState('')
  const [importCoverFile, setImportCoverFile] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const [search, setSearch] = useState('')
  const [coverUploadStatus, setCoverUploadStatus] = useState('')
  const [coverUploadError, setCoverUploadError] = useState('')
  const importSourceRef = useRef(null)
  const [selectedNovelId, setSelectedNovelId] = useState(novels[0]?.id ?? null)
  const [selectedSection, setSelectedSection] = useState('all')
  const [selectedChapterId, setSelectedChapterId] = useState(null)

  const getChapterCount = (novel) => novel?.chapters?.length ?? novel?.chapterCount ?? 0

  useEffect(() => {
    let canceled = false

    fetchStoredNovels()
      .then((storedNovels) => {
        if (!canceled && Array.isArray(storedNovels)) {
          setNovels(storedNovels)
          setSelectedNovelId(storedNovels[0]?.id ?? null)
        }
      })
      .catch((error) => {
        console.warn('Failed to load novels from backend:', error)
      })

    return () => {
      canceled = true
    }
  }, [])

  useEffect(() => {
    let canceled = false

    const novel = novels.find((item) => item.id === selectedNovelId)
    if (!novel || !selectedNovelId || novel.chapters?.length > 0) {
      return () => {
        canceled = true
      }
    }

    const loadNovelDetails = async () => {
      try {
        const fullNovel = await fetchNovelDetails(selectedNovelId)
        if (!canceled) {
          setNovels((prev) => prev.map((item) => (item.id === selectedNovelId ? fullNovel : item)))
        }
      } catch (error) {
        if (!canceled) {
          console.warn('Failed to load novel content:', error)
        }
      }
    }

    loadNovelDetails()

    return () => {
      canceled = true
    }
  }, [selectedNovelId, novels])

  const filteredNovels = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return novels
    }
    return novels.filter((novel) =>
      [novel.title, novel.description, novel.author].join(' ').toLowerCase().includes(query),
    )
  }, [search, novels])

  useEffect(() => {
    const syncWithHash = () => {
      const hash = window.location.hash.replace('#', '')

      if (hash.startsWith('chapter-')) {
        const parts = hash.split('-')
        const novelId = Number(parts[1])
        const chapterId = Number(parts[2])
        if (novels.some((novel) => novel.id === novelId)) {
          setSelectedNovelId(novelId)
          setSelectedChapterId(chapterId)
          setPage('chapter')
          return
        }
      }

      if (hash.startsWith('novel-')) {
        const novelId = Number(hash.split('-')[1])
        if (novels.some((novel) => novel.id === novelId)) {
          setSelectedNovelId(novelId)
          setSelectedChapterId(null)
          setPage('novel')
          return
        }
      }

      if (tabs.some((tab) => tab.id === hash)) {
        setPage(hash)
        return
      }

      setPage('home')
    }

    syncWithHash()
    window.addEventListener('hashchange', syncWithHash)
    return () => window.removeEventListener('hashchange', syncWithHash)
  }, [])

  const navigateTo = (nextPage) => {
    setPage(nextPage)
    const hash = nextPage === 'home' ? '#home' : `#${nextPage}`
    window.history.replaceState(null, '', hash)
  }

  const handleCoverChange = (event) => {
    const file = event.target.files?.[0] ?? null
    setImportCoverFile(file)

    if (!file) {
      setImportCoverPreview('')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImportCoverPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleCoverSelected = async (novelId, event) => {
    const file = event.target.files?.[0] ?? null
    if (!file) {
      return
    }

    setCoverUploadStatus('Uploading cover image...')
    setCoverUploadError('')

    try {
      const dataUrl = await fileToBase64(file)
      const fileData = dataUrl.split(',')[1]
      const response = await fetch(`${API_BASE}/api/cover-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: novelId,
          fileName: file.name,
          fileData,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to upload cover')
      }

      setNovels((prev) =>
        prev.map((novel) =>
          novel.id === novelId ? { ...novel, coverImage: result.coverImagePath } : novel,
        ),
      )
      setCoverUploadStatus('Cover updated successfully.')
    } catch (error) {
      console.error('Failed to upload cover image:', error)
      setCoverUploadError(error?.message || 'Upload failed.')
      setCoverUploadStatus('')
    } finally {
      event.target.value = ''
    }
  }

  const handleImport = () => {
    const url = importUrl.trim()
    if (!url) {
      setImportError('Please paste a light novel URL to import.')
      return
    }

    if (importSourceRef.current) {
      importSourceRef.current.close()
    }

    setImportLog([])
    setImportError('')
    setImportStatus('Starting import…')
    setIsImporting(true)

    const encodedUrl = encodeURIComponent(url)
    const source = new EventSource(`http://localhost:3001/api/import-stream?url=${encodedUrl}`)
    importSourceRef.current = source

    source.addEventListener('log', (event) => {
      setImportLog((prev) => [...prev.slice(-48), event.data])
      setImportStatus('Importing novel…')
    })

    source.addEventListener('done', async (event) => {
      try {
        const novel = JSON.parse(event.data)
        if (!novel || !novel.title) {
          throw new Error('Invalid import result')
        }

        const importedNovel = {
          ...novel,
          status: novel.status || 'reading',
          coverImage: importCoverPreview || novel.coverImage,
          coverGradient:
            novel.coverGradient || 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)',
        }

        const savedNovel = await saveNovelToBackend(importedNovel)

        setNovels((prev) => [...prev, savedNovel])
        setSelectedNovelId(savedNovel.id)
        setPage('catalogue')
        setImportStatus(`Imported “${savedNovel.title}” successfully.`)
        setImportUrl('')
        setImportCoverFile(null)
        setImportCoverPreview('')
      } catch (error) {
        console.error('Error saving imported novel:', error)
        setImportError(error.message || 'Failed to import novel.')
        setImportStatus('')
      } finally {
        setIsImporting(false)
        source.close()
        importSourceRef.current = null
      }
    })

    source.addEventListener('error', (event) => {
      const message = event?.data || 'Import failed.'
      setImportError(message)
      setImportStatus('')
      setIsImporting(false)
      if (source.readyState !== EventSource.CLOSED) {
        source.close()
      }
      importSourceRef.current = null
    })
  }

  const openNovel = (novelId) => {
    setSelectedNovelId(novelId)
    setSelectedChapterId(null)
    setPage('novel')
    window.history.replaceState(null, '', `#novel-${novelId}`)
  }

  const openChapter = (chapterId) => {
    setSelectedChapterId(chapterId)
    setPage('chapter')
    window.history.replaceState(null, '', `#chapter-${selectedNovelId}-${chapterId}`)
  }

  useEffect(() => {
    return () => {
      if (importSourceRef.current) {
        importSourceRef.current.close()
      }
    }
  }, [])

  const selectedNovel =
    novels.find((novel) => novel.id === selectedNovelId) ?? filteredNovels[0] ?? novels[0] ?? null

  const selectedChapter =
    selectedNovel?.chapters?.find((chapter) => chapter.id === selectedChapterId) ??
    selectedNovel?.chapters?.[0] ??
    null

  const chapterParagraphs = useMemo(() => {
    const text = selectedChapter?.contentText ?? ''
    if (!text.trim()) {
      return null
    }
    return text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
  }, [selectedChapter])

  const [paragraphAnalysis, setParagraphAnalysis] = useState([])
  const [analysisLoading, setAnalysisLoading] = useState(true)
  const [copiedParagraphIndex, setCopiedParagraphIndex] = useState(null)
  const [, startTransition] = useTransition()

  const extractPlainText = (html) => {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent || div.innerText || ''
  }

  const copyParagraphText = async (htmlContent, index) => {
    try {
      // Extract plain text from HTML (removes ruby tags and other markup)
      const plainText = extractPlainText(htmlContent)
      await navigator.clipboard.writeText(plainText)
      
      // Use transition to keep UI responsive during state update
      startTransition(() => {
        setCopiedParagraphIndex(index)
        setTimeout(() => {
          startTransition(() => {
            setCopiedParagraphIndex((current) => (current === index ? null : current))
          })
        }, 2000)
      })
    } catch (error) {
      console.error('Failed to copy paragraph text:', error)
    }
  }

  useEffect(() => {
    let canceled = false

    const loadAnalysis = async () => {
      if (!chapterParagraphs?.length) {
        setParagraphAnalysis([])
        return
      }

      setAnalysisLoading(true)
      try {
        const analysis = await Promise.all(
          chapterParagraphs.map(async (paragraph) => {
            try {
              const response = await fetch('http://localhost:3001/api/convert', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: paragraph }),
              })

              if (!response.ok) {
                throw new Error(`API error: ${response.status}`)
              }

              const data = await response.json()
              return { reading: data.reading }
            } catch (error) {
              console.error('Failed to convert paragraph:', error)
              return { reading: 'Error loading hiragana' }
            }
          }),
        )

        if (!canceled) {
          setParagraphAnalysis(analysis)
        }
      } catch (error) {
        console.error('Failed to load analysis:', error)
        if (!canceled) {
          setParagraphAnalysis([])
        }
      } finally {
        if (!canceled) {
          setAnalysisLoading(false)
        }
      }
    }

    loadAnalysis()
    return () => {
      canceled = true
    }
  }, [chapterParagraphs])

  const currentChapterIndex = selectedNovel?.chapters?.findIndex(
    (chapter) => chapter.id === selectedChapter?.id,
  )
  const previousChapter =
    selectedNovel?.chapters?.[currentChapterIndex > 0 ? currentChapterIndex - 1 : -1] ?? null
  const nextChapter =
    selectedNovel?.chapters?.[currentChapterIndex >= 0 ? currentChapterIndex + 1 : -1] ?? null

  const goToPreviousChapter = () => {
    if (previousChapter) {
      openChapter(previousChapter.id)
    }
  }

  const goToNextChapter = () => {
    if (nextChapter) {
      openChapter(nextChapter.id)
    }
  }

  const completedNovels = novels.filter((novel) => novel.status === 'completed')
  const readingNovels = novels.filter((novel) => novel.status === 'reading')

  // Get unique sections for the selected novel
  const novelSections = useMemo(() => {
    if (!selectedNovel?.chapters) return []
    const sections = new Set(selectedNovel.chapters.map((ch) => ch.section || 'その他'))
    return Array.from(sections).sort()
  }, [selectedNovel])

  // Filter chapters based on selected section
  const displayedChapters = useMemo(() => {
    if (!selectedNovel?.chapters) return []
    if (selectedSection === 'all') {
      return selectedNovel.chapters
    }
    return selectedNovel.chapters.filter((ch) => (ch.section || 'その他') === selectedSection)
  }, [selectedNovel, selectedSection])

  return (
    <div className="app-shell">
      <nav className="navbar">
        <div className="brand">
          <span className="brand-logo" style={{ backgroundImage: `url(${icon})` }}></span>
          <div>
            <h1>Light Novel</h1>
            <p>Collection manager</p>
          </div>
        </div>
        <ul className="nav-list">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                className={tab.id === page ? 'nav-button active' : 'nav-button'}
                onClick={() => navigateTo(tab.id)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {page === 'home' && (
        <header className="hero-panel">
          <div className="hero-main">
            <div className="hero-text">
              <span className="eyebrow">Welcome</span>
              <h2>Organize your light novels with fast imports and a calm reading experience.</h2>
              <p className="hero-copy">
                Add new titles with a single Syosetu link, preview the cover, and keep your library tidy.
              </p>
              <div className="hero-actions">
                <button
                  type="button"
                  className="hero-button"
                  onClick={handleImport}
                  disabled={isImporting}
                >
                  {isImporting ? 'Importing…' : 'Import now'}
                </button>
              </div>
            </div>

            <div className="hero-panel-card">
              <div className="import-card">
                <label htmlFor="importUrl" className="import-label">
                  Paste the novel URL you want to import:
                </label>
                <div className="import-row">
                  <div className="import-input-grid">
                    <input
                      id="importUrl"
                      type="url"
                      value={importUrl}
                      onChange={(event) => setImportUrl(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && handleImport()}
                      placeholder="https://ncode.syosetu.com/n6316bn/"
                      className="import-input"
                    />
                    <button
                      type="button"
                      className="import-button"
                      onClick={handleImport}
                      disabled={isImporting}
                    >
                      {isImporting ? 'Importing…' : 'Import'}
                    </button>
                  </div>
                </div>
                <label htmlFor="importCover" className="cover-upload-label">
                  Upload a cover image
                </label>
                <input
                  id="importCover"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="cover-upload-input"
                />
                {importCoverPreview && (
                  <div className="cover-preview">
                    <img src={importCoverPreview} alt="Cover preview" />
                  </div>
                )}
                {importStatus && <p className="import-status">{importStatus}</p>}
                {importError && <p className="import-error">{importError}</p>}
                {importLog.length > 0 && (
                  <div className="import-log">
                    <div className="import-log-header">
                      <strong>Import progress</strong>
                      {importLog.length > 10 && (
                        <span>Showing last 10 of {importLog.length}</span>
                      )}
                    </div>
                    <pre>{importLog.slice(-10).join('\n')}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="home-highlights">
            <article className="feature-card">
              <h3>Import in one step</h3>
              <p>Paste a book URL and import the entire series with chapter metadata and cover support.</p>
            </article>
            <article className="feature-card">
              <h3>Clear library view</h3>
              <p>Browse your novels with a minimal interface that keeps the focus on reading.</p>
            </article>
            <article className="feature-card">
              <h3>Live import feedback</h3>
              <p>Track progress as the scraper runs, with logs shown in real time.</p>
            </article>
          </div>
        </header>
      )}

      {page === 'catalogue' && (
        <section className="catalog-panel">
          <div className="catalog-controls">
            <div>
              <h2>Light novel catalogue</h2>
              <p>Browse novels in a vertical carousel layout with five columns.</p>
            </div>
            <label className="search-field">
              <span>Search novels</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, author, or keyword"
              />
            </label>
          </div>

          {filteredNovels.length > 0 ? (
            <div className="card-grid">
              {filteredNovels.map((novel) => (
                <article
                  key={novel.id}
                  className={`catalog-card ${selectedNovel?.id === novel.id ? 'active' : ''}`}
                  onClick={() => openNovel(novel.id)}
                >
                  <div
                    className="cover-image"
                    style={
                      novel.coverImage
                        ? { backgroundImage: `url(${novel.coverImage})` }
                        : {
                            backgroundImage: `url(${tensuraCover})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                    }
                  >
                    <span>{novel.title.split(' ').slice(0, 2).join(' ')}</span>
                  </div>
                  <div className="card-body">
                    <div>
                      <h3>{novel.title}</h3>
                      <p>{novel.author}</p>
                    </div>
                    <div className="card-meta">{getChapterCount(novel)} chapters</div>
                  </div>
                  <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                    <label
                      htmlFor={`cover-input-${novel.id}`}
                      className="cover-edit-button"
                      aria-label="Edit cover"
                      title="Edit cover"
                    >
                      ✎
                    </label>
                    <input
                      id={`cover-input-${novel.id}`}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(event) => handleCoverSelected(novel.id, event)}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No novels found</h3>
              <p>Try a different keyword or clear the search field.</p>
            </div>
          )}
          {coverUploadStatus && <div className="upload-status">{coverUploadStatus}</div>}
          {coverUploadError && <div className="upload-error">{coverUploadError}</div>}
        </section>
      )}

      {page === 'novel' && selectedNovel && (
        <section className="detail-page">
          <div className="detail-panel-header">
            <button type="button" className="back-button" onClick={() => navigateTo('catalogue')}>
              ← Back to catalogue
            </button>
            <div className="detail-header-body">
              <img
                src={selectedNovel.coverImage || tensuraCover}
                alt={`${selectedNovel.title} cover`}
                className="cover-thumb"
              />
              <div className="detail-header-text">
                <span className="eyebrow">Chapter list</span>
                <h2>{selectedNovel.title}</h2>
                <p className="detail-description">{selectedNovel.description}</p>
                <div className="detail-meta-row">
                  <div className="detail-meta-item">
                    <span>Author:</span>
                    <strong>{selectedNovel.author}</strong>
                  </div>
                  <div className="detail-meta-item">
                    <span>Year Released:</span>
                    <strong>{selectedNovel.year}</strong>
                  </div>
                  <div className="detail-meta-item">
                    <span>Total Chapters:</span>
                    <strong>{getChapterCount(selectedNovel)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <article className="selected-panel detail-page-card">
            <div className="chapter-list">
              <div className="section-heading">
                <div>
                  <h3>Chapters</h3>
                  <span>{displayedChapters.length} items</span>
                </div>
                {novelSections.length > 0 && (
                  <label className="section-filter">
                    <span>Filter by section:</span>
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                    >
                      <option value="all">All sections</option>
                      {novelSections.map((section) => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <ol>
                {displayedChapters.map((chapter) => (
                  <li
                    key={chapter.id}
                    className={chapter.id === selectedChapterId ? 'active' : ''}
                    onClick={() => openChapter(chapter.id)}
                  >
                    <strong>{chapter.title}</strong>
                    {chapter.section && <p className="chapter-section">{chapter.section}</p>}
                  </li>
                ))}
              </ol>
            </div>
          </article>
        </section>
      )}

      {page === 'chapter' && selectedNovel && selectedChapter && (
        <section className="detail-page">
          <div className="detail-panel-header">
            <div>
              <span className="eyebrow">Reading</span>
              <h2>{selectedChapter.title}</h2>
              <p className="detail-description">{selectedNovel.title}</p>
              <div className="detail-meta-row">
                <div className="detail-meta-item">
                  <span>Chapter:</span>
                  <strong>{currentChapterIndex + 1} / {getChapterCount(selectedNovel)}</strong>
                </div>
              </div>
            </div>
            <button type="button" className="back-button" onClick={() => navigateTo('novel')}>
              ← Back to chapter list
            </button>
          </div>

          <div className="chapter-navigation">
            <button
              type="button"
              className="chapter-nav-button"
              onClick={goToPreviousChapter}
              disabled={!previousChapter}
            >
              ← Previous chapter
            </button>
            <button
              type="button"
              className="chapter-nav-button"
              onClick={goToNextChapter}
              disabled={!nextChapter}
            >
              Next chapter →
            </button>
          </div>

          <article className="chapter-content">
            <div className="chapter-text">
              {chapterParagraphs ? (
                chapterParagraphs.map((paragraph, index) => (
                  <div key={index} className="chapter-paragraph-wrap">
                    <button
                      type="button"
                      className={`copy-paragraph-button ${copiedParagraphIndex === index ? 'copied' : ''}`}
                      aria-label={copiedParagraphIndex === index ? 'Copied' : 'Copy chapter paragraph'}
                      onClick={() => copyParagraphText(paragraphAnalysis[index]?.reading || paragraph, index)}
                    >
                      {copiedParagraphIndex === index ? (
                        <svg className="copy-icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M20.285 6.708a1 1 0 0 0-1.414-1.416L9 15.164l-3.87-3.87a1 1 0 0 0-1.414 1.414l4.577 4.577a1 1 0 0 0 1.414 0l10.578-10.577Z"
                            fill="currentColor"
                          />
                        </svg>
                      ) : (
                        <svg className="copy-icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M16 1H5a2 2 0 0 0-2 2v14h2V3h11V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"
                            fill="currentColor"
                          />
                        </svg>
                      )}
                    </button>
                    <p
                      dangerouslySetInnerHTML={{
                        __html: paragraphAnalysis[index]?.reading || paragraph,
                      }}
                    />
                  </div>
                ))
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: selectedChapter.content }}
                />
              )}
            </div>
          </article>

          <div className="chapter-navigation chapter-navigation-bottom">
            <button
              type="button"
              className="chapter-nav-button"
              onClick={goToPreviousChapter}
              disabled={!previousChapter}
            >
              ← Previous chapter
            </button>
            <button
              type="button"
              className="chapter-nav-button"
              onClick={goToNextChapter}
              disabled={!nextChapter}
            >
              Next chapter →
            </button>
          </div>
        </section>
      )}

      {page === 'completed' && (
        <section className="status-panel">
          <div className="status-header">
            <h2>Completed novels</h2>
            <p>Stories you have already finished reading.</p>
          </div>
          <div className="status-cards">
            {completedNovels.length > 0 ? (
              completedNovels.map((novel) => (
                <article key={novel.id} className="status-card">
                  <h3>{novel.title}</h3>
                  <p>{novel.author}</p>
                  <span className="tag">{getChapterCount(novel)} chapters</span>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <h3>No completed novels yet</h3>
                <p>Switch a novel’s status to completed to populate this list.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {page === 'reading' && (
        <section className="status-panel">
          <div className="status-header">
            <h2>Currently reading</h2>
            <p>Novels you are actively following right now.</p>
          </div>
          <div className="status-cards">
            {readingNovels.length > 0 ? (
              readingNovels.map((novel) => (
                <article key={novel.id} className="status-card">
                  <h3>{novel.title}</h3>
                  <p>{novel.author}</p>
                  <span className="tag">{getChapterCount(novel)} chapters</span>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <h3>No novels in progress</h3>
                <p>Pick a novel from the catalogue to start reading.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default App
