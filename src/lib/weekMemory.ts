import type { Diary } from "@/types";

export interface RelatedOldDiary {
  diary: Diary;
  daysAgo: number;
  sharedTopicName: string;
}

/**
 * 从同一课题的日记中找3-30天前的旧日记。
 * 优先找时间最近的一篇。
 */
export function findRelatedOldDiary(
  currentDiary: Diary,
  allDiaries: Diary[],
  topicNameMap: Record<string, string>,
  minDays = 3,
  maxDays = 30
): RelatedOldDiary | null {
  const now = currentDiary.createdAt.getTime();
  const currentTopicIds = currentDiary.topicIds || [];
  if (currentTopicIds.length === 0) return null;

  const candidates: RelatedOldDiary[] = [];

  for (const old of allDiaries) {
    if (old.id === currentDiary.id) continue;
    const daysAgo = (now - old.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo < minDays || daysAgo > maxDays) continue;

    const sharedTopics = ((old.topicIds || [])).filter(tid => currentTopicIds.includes(tid));
    if (sharedTopics.length === 0) continue;

    const sharedTopicName = topicNameMap[sharedTopics[0]] || "";
    candidates.push({ diary: old, daysAgo: Math.round(daysAgo), sharedTopicName });
  }

  if (candidates.length === 0) return null;

  // Pick the one with smallest daysAgo (closest in time)
  candidates.sort((a, b) => a.daysAgo - b.daysAgo);
  return candidates[0];
}
