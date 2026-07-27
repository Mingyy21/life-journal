"use client";
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, createInsight, getAllBaselines } from "@/lib/db";
import { useInit } from "@/components/InitProvider";
import type { Insight, Diary } from "@/types";

export interface BaselineData {
  topicId: string;
  topicName: string;
  baseline: string;
  status: "good" | "warn" | "bad" | "unset";
  diaryCount: number;
}

export interface VisionData {
  article: Insight | null;
  baselines: BaselineData[];
}

export function useVision() {
  const { ready } = useInit();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const { data: visionData, refetch } = useQuery({
    queryKey: ["vision"],
    queryFn: async (): Promise<VisionData> => {
      const all = await db.insights.toArray();
      const article = all.find(i => i.type === "vision") || null;

      const baselineInsights = all.filter(i => i.type === "baseline");
      const topics = await db.topics.toArray();

      // 计算每个课题的日记数用于活跃度
      const diaries = await db.diaries.toArray();
      const diaryCountMap = new Map<string, number>();
      for (const d of diaries) {
        for (const tid of d.topicIds || []) {
          diaryCountMap.set(tid, (diaryCountMap.get(tid) || 0) + 1);
        }
      }

      const baselines: BaselineData[] = topics
        .filter(t => t.id !== "topic-life-vision")
        .map(t => {
          const bl = baselineInsights.find(i => i.linkedTopicId === t.id);
          return {
            topicId: t.id,
            topicName: t.name,
            baseline: bl?.content || "",
            status: bl ? "good" as const : "unset" as const,
            diaryCount: diaryCountMap.get(t.id) || 0,
          };
        });

      return { article, baselines };
    },
    staleTime: 30_000,
    enabled: ready,
  });

  const generateVision = useCallback(async () => {
    setGenerating(true);
    setError("");
    try {
      // 读取人生理想课题下的日记
      const allDiaries = await db.diaries.toArray();
      const visionDiaries = allDiaries
        .filter(d => (d.topicIds || []).includes("topic-life-vision"))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      if (visionDiaries.length === 0) {
        setError("还没有关于人生理想的日记，先去写一些吧");
        setGenerating(false);
        return;
      }

      const res = await fetch("/api/generate-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diaries: visionDiaries.map(d => ({
            title: d.title,
            content: d.content,
            createdAt: d.createdAt.toISOString(),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");

      // 检查是否已有展望
      const allInsights = await db.insights.toArray();
      const existing = allInsights.find(i => i.type === "vision");

      // 保存展望文章
      const versionGroup = existing?.versionGroup || crypto.randomUUID();
      await createInsight({
        title: "我的人生展望",
        content: data.article,
        linkedEventIds: ["event-life-vision"],
        linkedTopicIds: ["topic-life-vision"],
        type: "vision",
      });

      // 保存课题底线
      const topics = await db.topics.toArray();
      for (const bl of data.baselines || []) {
        const matched = topics.find(t => bl.topicName.includes(t.name) || t.name.includes(bl.topicName));
        if (matched) {
          const existingBl = allInsights.find(i => i.type === "baseline" && i.linkedTopicId === matched.id);
          if (!existingBl) {
            await createInsight({
              title: `${matched.name}底线`,
              content: bl.suggestedBaseline,
              linkedEventIds: ["event-life-vision"],
              linkedTopicIds: ["topic-life-vision", matched.id],
              type: "baseline",
              linkedTopicId: matched.id,
            });
          }
        }
      }

      await refetch();
    } catch (err: any) {
      setError(err.message || "生成失败");
    } finally {
      setGenerating(false);
    }
  }, [refetch]);

  return {
    article: visionData?.article || null,
    baselines: visionData?.baselines || [],
    generating,
    error,
    generateVision,
  };
}
