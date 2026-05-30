-- Novels table
CREATE TABLE IF NOT EXISTS novels (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  chapterCount INTEGER DEFAULT 0,
  fileName TEXT,
  status TEXT DEFAULT 'reading',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  novelId INTEGER NOT NULL,
  chapterNumber INTEGER NOT NULL,
  title TEXT NOT NULL,
  section TEXT,
  content TEXT,
  contentText TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (novelId) REFERENCES novels(id) ON DELETE CASCADE,
  UNIQUE(novelId, chapterNumber)
);

-- Cover images mapping
CREATE TABLE IF NOT EXISTS coverImages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  novelId INTEGER NOT NULL UNIQUE,
  coverImagePath TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (novelId) REFERENCES novels(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_chapters_novelId ON chapters(novelId);
CREATE INDEX IF NOT EXISTS idx_chapters_novelId_number ON chapters(novelId, chapterNumber);
CREATE INDEX IF NOT EXISTS idx_coverImages_novelId ON coverImages(novelId);
