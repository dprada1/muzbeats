-- Create beats table
-- This matches the Beat type structure from your JSON data

CREATE TABLE IF NOT EXISTS beats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  key VARCHAR(50) NOT NULL,
  bpm INTEGER NOT NULL CHECK (bpm > 0 AND bpm < 300),
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  audio_path VARCHAR(500) NOT NULL,
  cover_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_beats_bpm ON beats(bpm);
CREATE INDEX IF NOT EXISTS idx_beats_key ON beats(key);
CREATE INDEX IF NOT EXISTS idx_beats_price ON beats(price);

