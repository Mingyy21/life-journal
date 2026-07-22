import Dexie from "dexie";
import { supabaseProxy } from "@/lib/supabase/dexie-compat";
import { supabase } from "@/lib/supabase/client";

const MIGRATION_FLAG = "dexie_migrated_v2";

function dbExists(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = indexedDB.open(name);
    req.onupgradeneeded = () => {
      req.transaction?.abort();
      resolve(false);
    };
    req.onsuccess = () => {
      req.result.close();
      resolve(true);
    };
    req.onerror = () => resolve(false);
  });
}

export async function migrateFromDexie(): Promise<{
  migrated: number;
  skipped: number;
  error?: string;
}> {
  if (typeof window === "undefined") return { migrated: 0, skipped: 0 };

  const alreadyMigrated = localStorage.getItem(MIGRATION_FLAG);
  if (alreadyMigrated) return { migrated: 0, skipped: 0 };

  const exists = await dbExists("LifeJournalDB");
  if (!exists) {
    localStorage.setItem(MIGRATION_FLAG, "true");
    return { migrated: 0, skipped: 0 };
  }

  // Get current user for context
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { migrated: 0, skipped: 0, error: "未登录" };

  // Check if Supabase already has meaningful data (more than defaults)
  const existingDiaries = await supabaseProxy.diaries.toArray();
  const hasUserData = existingDiaries.length > 0;

  let oldDb: Dexie | null = null;
  let totalMigrated = 0;
  let totalSkipped = 0;

  try {
    // Must match the original Dexie schema exactly
    oldDb = new Dexie("LifeJournalDB");
    oldDb.version(3).stores({
      lifeDomains: "id",
      topics: "id, domainId",
      diaries: "id, createdAt, updatedAt, *topicIds, hasAnalysis, eventId",
      analysisResults: "id, diaryId, createdAt",
      events: "id, topicId, resolutionStatus, createdAt",
      insights: "id, createdAt",
    });
    await oldDb.open();

    const existingSupabaseIds = new Map<string, Set<string>>();

    // Collect existing Supabase IDs to avoid duplicates
    if (hasUserData) {
      for (const tableName of ["lifeDomains", "topics", "diaries", "events", "insights", "analysisResults"] as const) {
        const items = await supabaseProxy[tableName].toArray();
        existingSupabaseIds.set(tableName, new Set(items.map((i: any) => i.id)));
      }
    }

    // Migrate in dependency order
    const tableOrder = [
      { name: "lifeDomains" as const },
      { name: "topics" as const },
      { name: "events" as const },
      { name: "diaries" as const },
      { name: "analysisResults" as const },
      { name: "insights" as const },
    ];

    for (const { name } of tableOrder) {
      const table = oldDb.table(name);
      const count = await table.count();
      if (count === 0) continue;

      const existing = existingSupabaseIds.get(name) ?? new Set<string>();
      const all = await table.toArray();
      const toAdd = all.filter((item: any) => !existing.has(item.id));

      if (toAdd.length === 0) {
        totalSkipped += all.length;
        continue;
      }

      // Try bulk insert
      try {
        await supabaseProxy[name].bulkAdd(toAdd);
        totalMigrated += toAdd.length;
      } catch {
        // Fall back to individual inserts (safest)
        let added = 0;
        for (const item of toAdd) {
          try {
            await supabaseProxy[name].add(item);
            added++;
          } catch {
            totalSkipped++;
          }
        }
        totalMigrated += added;
        totalSkipped += toAdd.length - added;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "迁移失败";
    console.warn("[migrate] 出错:", msg);
    return { migrated: totalMigrated, skipped: totalSkipped, error: msg };
  } finally {
    oldDb?.close();
  }

  localStorage.setItem(MIGRATION_FLAG, "true");
  console.log(`[migrate] 完成: ${totalMigrated} 条导入, ${totalSkipped} 条跳过`);
  return { migrated: totalMigrated, skipped: totalSkipped };
}
