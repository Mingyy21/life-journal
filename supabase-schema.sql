-- 人生手记 Supabase 建表脚本
-- 在 Supabase SQL Editor 中粘贴并运行此脚本
-- 表名使用小写，与 dexie-compat.ts 中的字符串一致

-- 1. lifedomains
CREATE TABLE IF NOT EXISTS lifedomains (
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

-- 5. analysisresults
CREATE TABLE IF NOT EXISTS analysisresults (
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
  "referenceCount" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. worldviews（预留）
CREATE TABLE IF NOT EXISTS worldviews (
  id TEXT PRIMARY KEY,
  "userId" UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  "topicIds" TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引（提升查询性能）
CREATE INDEX IF NOT EXISTS idx_diaries_userId ON diaries("userId");
CREATE INDEX IF NOT EXISTS idx_diaries_createdAt ON diaries("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_diaries_eventId ON diaries("userId", "eventId");
CREATE INDEX IF NOT EXISTS idx_events_topicId ON events("userId", "topicId");
CREATE INDEX IF NOT EXISTS idx_events_resolutionStatus ON events("userId", "resolutionStatus");
CREATE INDEX IF NOT EXISTS idx_topics_domainId ON topics("userId", "domainId");
CREATE INDEX IF NOT EXISTS idx_analysisresults_diaryId ON analysisresults("userId", "diaryId");
CREATE INDEX IF NOT EXISTS idx_insights_createdAt ON insights("userId", "createdAt" DESC);

-- RLS（行级安全）：用户只能看到自己的数据
ALTER TABLE lifedomains ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysisresults ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE worldviews ENABLE ROW LEVEL SECURITY;

-- 所有表统一策略：auth.uid() = "userId"
CREATE POLICY "owner_access" ON lifedomains FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "owner_access" ON topics FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "owner_access" ON diaries FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "owner_access" ON analysisresults FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "owner_access" ON events FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "owner_access" ON insights FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "owner_access" ON worldviews FOR ALL USING (auth.uid() = "userId");
