-- Feedback replies table
CREATE TABLE IF NOT EXISTS feedback_replies (
  id SERIAL PRIMARY KEY,
  feedback_id INT NOT NULL REFERENCES feedbacks(id) ON DELETE CASCADE,
  user_id INT REFERENCES "user"(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_replies_feedback_id
  ON feedback_replies(feedback_id);

-- Feedback likes table
CREATE TABLE IF NOT EXISTS feedback_likes (
  id SERIAL PRIMARY KEY,
  feedback_id INT NOT NULL REFERENCES feedbacks(id) ON DELETE CASCADE,
  user_id INT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE feedback_likes
  ADD CONSTRAINT uq_feedback_like UNIQUE (feedback_id, user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_likes_feedback_id
  ON feedback_likes(feedback_id);

