-- 人生手记 Supabase 建表脚本
-- 在 Supabase SQL Editor 中粘贴并运行此脚本

-- 1. life_domains
CREATE TABLE IF NOT EXISTS lifeDomains (
  id TEXT PRIMARY KEY,
  "userId" UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0
);

-- 2. topics
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  "userId" UUID NOT NULL DEFAULT auth.uid(),
  "domainId" TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  "diaryCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. events
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  "userId" UUID NOT NULL DEFAULT auth.uid(),
  "topicId" TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  "resolutionStatus" TEXT NOT NULL DEFAULT 'unresolved',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. diaries
CREATE TABLE IF NOT EXISTS diaries (
  id TEXT PRIMARY KEY,
  "userId" UUID NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  "topicIds" TEXT[] NOT NULL DEFAULT '{}',
  "eventId" TEXT,
  "analysisId" TEXT,
  "hasAnalysis" BOOLEAN NOT NULL DEFAULT FALSE,
  "wordCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. analysisResults
CREATE TABLE IF NOT EXISTS analysisResults (
  id TEXT PRIMARY KEY,
  "userId" UUID NOT NULL DEFAULT auth.uid(),
  "diaryId" TEXT NOT NULL,
  "vadScore" JSONB NOT NULL,
  "emotionLabels" JSONB NOT NULL,
  "primaryEmotion" TEXT NOT NULL,
  intensity REAL NOT NULL,
  "cognitiveStage" TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  insight TEXT NOT NULL,
  feedback TEXT NOT NULL,
  "followUpQuestion" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. insights
CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,
  "userId" UUID NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  "linkedEventIds" TEXT[] NOT NULL DEFAULT '{}',
  "linkedTopicIds" TEXT[] NOT NULL DEFAULT '{}',
  "sourceDiaryId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_diaries_userId ON diaries("userId");
CREATE INDEX IF NOT EXISTS idx_diaries_createdAt ON diaries("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_diaries_eventId ON diaries("userId", "eventId");
CREATE INDEX IF NOT EXISTS idx_events_topicId ON events("userId", "topicId");
CREATE INDEX IF NOT EXISTS idx_events_resolutionStatus ON events("userId", "resolutionStatus");
CREATE INDEX IF NOT EXISTS idx_topics_domainId ON topics("userId", "domainId");
CREATE INDEX IF NOT EXISTS idx_analysisResults_diaryId ON analysisResults("userId", "diaryId");
CREATE INDEX IF NOT EXISTS idx_insights_createdAt ON insights("userId", "createdAt" DESC);

-- RLS
ALTER TABLE lifeDomains ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysisResults ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_access" ON lifeDomains FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "owner_access" ON topics FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "owner_access" ON diaries FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "owner_access" ON analysisResults FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "owner_access" ON events FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "owner_access" ON insights FOR ALL USING (auth.uid() = "userId");
