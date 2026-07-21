"use client";
import { useMemo } from "react";
import type { Diary, Topic } from "@/types";

/**
 * 检测是否应该建议用户创建事件：
 * 同一课题下，连续≥3篇日记（eventId=null的日常记录）→ 提示用户归纳为事件
 */
export function useSuggestEvent(diaries: Diary[], topics: Topic[]) {
  const suggestion = useMemo(() => {
    // 按课题分组，统计连续无事件的日记
    const topicGroups = new Map<string, Diary[]>();

    for (const diary of diaries) {
      if (diary.eventId) continue; // 已有事件，跳过
      for (const tid of diary.topicIds || []) {
        if (!topicGroups.has(tid)) topicGroups.set(tid, []);
        topicGroups.get(tid)!.push(diary);
      }
    }

    // 检查是否有课题≥3篇未归类日记
    for (const [topicId, td] of topicGroups) {
      if (td.length >= 3) {
        // 只取最早的3篇来计算（按时间正序）
        const sorted = [...td].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const topic = topics.find(t => t.id === topicId);
        if (topic) {
          return {
            topicId,
            topicName: topic.name,
            topicColor: topic.color,
            count: td.length,
            earliestDate: sorted[0].createdAt,
            latestDate: sorted[sorted.length - 1].createdAt,
          };
        }
      }
    }

    return null;
  }, [diaries, topics]);

  return suggestion;
}
