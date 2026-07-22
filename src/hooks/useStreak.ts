"use client";
import { useMemo } from "react";
import { db } from "@/lib/db";
import { useQuery } from "@tanstack/react-query";
import { useInit } from "@/components/InitProvider";

function normalizeDate(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export interface StreakData {
  /** 当前连续天数 */
  count: number;
  /** 连续是否存活（今天或昨天写过就算活着） */
  alive: boolean;
  /** 今日已写 */
  wroteToday: boolean;
  /** 上次记录的日期字符串 */
  lastDate: string | null;
}

export function useStreak(): StreakData {
  const { ready } = useInit();

  const { data } = useQuery({
    queryKey: ["streak"],
    queryFn: async (): Promise<StreakData> => {
      const all = await db.diaries.orderBy("createdAt").reverse().toArray();
      if (all.length === 0) return { count: 0, alive: false, wroteToday: false, lastDate: null };

      const today = new Date();
      const todayKey = normalizeDate(today);

      // 去重同一天，取排序后的唯一日期
      const dateSet = new Set<string>();
      for (const d of all) {
        // diaries 的 createdAt 可能在 dexie-compat 中被转为 Date
        const key = normalizeDate(d.createdAt);
        dateSet.add(key);
      }
      const sorted = Array.from(dateSet).sort().reverse();

      const lastKey = sorted[0];
      if (lastKey !== todayKey) {
        // 最后记录既不是今天也不是昨天 → 断了
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = normalizeDate(yesterday);
        if (lastKey !== yesterdayKey) {
          // 断了，返回最后一条的连续
          // 从后往前找连续段
          let streak = 1;
          for (let i = 1; i < sorted.length; i++) {
            const prev = new Date(sorted[i - 1]);
            const curr = new Date(sorted[i]);
            const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
            if (Math.round(diff) === 1) {
              streak++;
            } else {
              break;
            }
          }
          return { count: streak, alive: false, wroteToday: false, lastDate: lastKey };
        }
      }

      const wroteToday = lastKey === todayKey;
      let streak = 1;
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1]);
        const curr = new Date(sorted[i]);
        const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
        if (Math.round(diff) === 1) {
          streak++;
        } else {
          break;
        }
      }

      return { count: streak, alive: true, wroteToday, lastDate: lastKey };
    },
    staleTime: 30_000,
    enabled: ready,
  });

  return useMemo(() => data ?? { count: 0, alive: false, wroteToday: false, lastDate: null }, [data]);
}
