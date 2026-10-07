CREATE TABLE IF NOT EXISTS compiler_feedback (
  operation TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  edition TEXT NOT NULL,
  item TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS compiler_feedback_item_kind ON compiler_feedback(edition,item,kind);

CREATE TABLE IF NOT EXISTS compiler_comments (
  operation TEXT PRIMARY KEY NOT NULL,
  edition TEXT NOT NULL,
  item TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS compiler_comments_item ON compiler_comments(edition,item,created_at);

CREATE TABLE IF NOT EXISTS compiler_watchlist_ballots (
  topic TEXT NOT NULL,
  ballot TEXT NOT NULL,
  choice TEXT NOT NULL,
  revision INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(topic,ballot)
);
