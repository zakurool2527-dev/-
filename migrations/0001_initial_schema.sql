-- 提案履歴テーブル
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  pdf_filename TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  property_title TEXT,
  property_location TEXT,
  property_price TEXT,
  property_summary TEXT,
  generated_content TEXT NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('pptx', 'odf')),
  file_url TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 提案先カテゴリーテーブル（よく使う提案先を記録）
CREATE TABLE IF NOT EXISTS target_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_target ON proposals(target_audience);
CREATE INDEX IF NOT EXISTS idx_target_categories_usage ON target_categories(usage_count DESC);
