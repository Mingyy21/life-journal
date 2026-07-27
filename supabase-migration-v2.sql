-- 人生手记 v0.5 数据库迁移
-- 人生展望 + 感悟关系
-- 在 Supabase SQL Editor 中运行

-- 1. insights 表新增字段
ALTER TABLE insights ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE insights ADD COLUMN IF NOT EXISTS "linkedTopicId" TEXT;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS "versionGroup" TEXT;

-- 2. 创建 insight_relations 表
CREATE TABLE IF NOT EXISTS insight_relations (
  id TEXT PRIMARY KEY,
  "userId" UUID NOT NULL DEFAULT auth.uid(),
  "sourceId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "relationType" TEXT NOT NULL CHECK ("relationType" IN ('parent', 'child', 'sibling', 'opposite')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_insights_type ON insights("userId", "type");
CREATE INDEX IF NOT EXISTS idx_insights_linkedTopicId ON insights("userId", "linkedTopicId");
CREATE INDEX IF NOT EXISTS idx_ir_sourceId ON insight_relations("userId", "sourceId");
CREATE INDEX IF NOT EXISTS idx_ir_targetId ON insight_relations("userId", "targetId");

-- 4. RLS
ALTER TABLE insight_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_access" ON insight_relations FOR ALL USING (auth.uid() = "userId");

-- 注：人生理想课题和人生展望事件由 app 端 initDefaultData 自动创建
