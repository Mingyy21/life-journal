import { supabase } from "./client";
import type { Diary, Topic, LifeDomain, AnalysisResult, Event, Insight } from "@/types";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonPrimitive[] | Record<string, any>;

const DATE_KEYS = new Set(["createdAt", "updatedAt"]);

function deserializeDates<T>(row: any): T {
  if (!row || typeof row !== "object") return row as T;
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = v;
    if (DATE_KEYS.has(k) && typeof v === "string") {
      out[k] = new Date(v);
    }
  }
  return out as T;
}

function serializeDates(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

let _userId: string | null = null;

export function setUserId(uid: string | null) {
  _userId = uid;
}

function userId(): string {
  if (!_userId) throw new Error("Not authenticated");
  return _userId;
}

// ── Query builder ──

class SupabaseCollection<T extends { id: string }> {
  private filters: { col: string; op: string; value: any }[] = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private predicate: ((item: T) => boolean) | null = null;

  constructor(
    private tableName: string,
    filters?: { col: string; op: string; value: any }[],
    orderCol?: string | null,
    orderAsc?: boolean,
    limitN?: number | null,
    predicate?: ((item: T) => boolean) | null,
  ) {
    if (filters) this.filters = [...filters];
    if (orderCol !== undefined) this.orderCol = orderCol;
    if (orderAsc !== undefined) this.orderAsc = orderAsc;
    if (limitN !== undefined) this.limitN = limitN;
    if (predicate !== undefined) this.predicate = predicate;
  }

  private clone(overrides: Partial<{
    filters: { col: string; op: string; value: any }[];
    orderCol: string | null;
    orderAsc: boolean;
    limitN: number | null;
    predicate: ((item: T) => boolean) | null;
  }>): SupabaseCollection<T> {
    return new SupabaseCollection<T>(
      this.tableName,
      overrides.filters ?? this.filters,
      overrides.orderCol ?? this.orderCol,
      overrides.orderAsc ?? this.orderAsc,
      overrides.limitN ?? this.limitN,
      overrides.predicate ?? this.predicate,
    );
  }

  equals(value: any): SupabaseCollection<T> {
    const lastFilter = this.filters[this.filters.length - 1];
    const col = lastFilter?.col || "id";
    return this.clone({ filters: [...this.filters, { col, op: "eq", value }] });
  }

  aboveOrEqual(value: any): SupabaseCollection<T> {
    const lastFilter = this.filters[this.filters.length - 1];
    const col = lastFilter?.col || "id";
    return this.clone({ filters: [...this.filters, { col, op: "gte", value }] });
  }

  between(lower: any, upper: any, _lowerOpen?: boolean, _upperOpen?: boolean): SupabaseCollection<T> {
    const lastFilter = this.filters[this.filters.length - 1];
    const col = lastFilter?.col || "id";
    return this.clone({ filters: [...this.filters, { col, op: "gte", value: lower }, { col, op: "lte", value: upper }] });
  }

  reverse(): SupabaseCollection<T> {
    return this.clone({ orderAsc: !this.orderAsc });
  }

  private buildQuery() {
    let req = supabase.from(this.tableName).select("*", { count: "exact" });
    req = req.eq("userId", userId());

    for (const f of this.filters) {
      if (f.op === "eq") req = req.eq(f.col, f.value);
      else if (f.op === "gte") req = req.gte(f.col, f.value);
      else if (f.op === "lte") req = req.lte(f.col, f.value);
    }
    if (this.orderCol) {
      req = req.order(this.orderCol, { ascending: this.orderAsc });
    }
    if (this.limitN !== null) {
      req = req.limit(this.limitN);
    }
    return req;
  }

  async toArray(): Promise<T[]> {
    const req = this.buildQuery();
    const { data, error } = await req;
    if (error) throw error;
    let rows = (data || []).map(deserializeDates<T>);
    // Supabase may not apply orderCol correctly if the column doesn't exist in Postgres - fallback sort in JS
    if (this.orderCol && rows.length > 1) {
      const col = this.orderCol;
      const asc = this.orderAsc;
      const firstVal = rows[0]?.[col as keyof T];
      // Only sort in JS if Supabase didn't sort (compare first two items)
      if (typeof firstVal === "string" || firstVal instanceof Date || typeof firstVal === "number") {
        const ordered = [...rows].sort((a: any, b: any) => {
          const va = a[col] instanceof Date ? a[col].getTime() : a[col];
          const vb = b[col] instanceof Date ? b[col].getTime() : b[col];
          if (va < vb) return asc ? -1 : 1;
          if (va > vb) return asc ? 1 : -1;
          return 0;
        });
        // Check if re-sorting actually changed order
        const needsReorder = ordered.some((item, i) => item !== rows[i]);
        if (needsReorder) rows = ordered;
      }
    }
    if (this.predicate) {
      rows = rows.filter(this.predicate);
    }
    return rows;
  }

  async first(): Promise<T | undefined> {
    const req = this.buildQuery().limit(1);
    const { data, error } = await req;
    if (error) throw error;
    if (!data || data.length === 0) return undefined;
    return deserializeDates<T>(data[0]);
  }

  async last(): Promise<T | undefined> {
    const col = this.orderCol || "createdAt";
    const req = supabase.from(this.tableName).select("*").eq("userId", userId());
    // Apply filters
    for (const f of this.filters) {
      if (f.op === "eq") req.eq(f.col, f.value);
      else if (f.op === "gte") req.gte(f.col, f.value);
      else if (f.op === "lte") req.lte(f.col, f.value);
    }
    const { data, error } = await req.order(col, { ascending: false }).limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return undefined;
    return deserializeDates<T>(data[0]);
  }

  async count(): Promise<number> {
    const req = this.buildQuery();
    const { count, error } = await req;
    if (error) throw error;
    return count || 0;
  }

  sortBy(key: string): Promise<T[]> {
    return this.clone({ orderCol: key, orderAsc: true }).toArray();
  }
}

// ── Table proxy ──

export class SupabaseTable<T extends { id: string }> {
  constructor(private tableName: string) {}

  async get(id: string): Promise<T | undefined> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select("*")
      .eq("id", id)
      .eq("userId", userId())
      .single();
    if (error) {
      if (error.code === "PGRST116") return undefined;
      throw error;
    }
    return deserializeDates<T>(data);
  }

  async add(item: T): Promise<string> {
    const row = serializeDates({ ...item, userId: userId() });
    const { error } = await supabase.from(this.tableName).insert(row);
    if (error) throw error;
    return item.id;
  }

  async put(item: T): Promise<void> {
    const existing = await this.get(item.id);
    const row = serializeDates({ ...item, userId: userId() });
    if (existing) {
      const { error } = await supabase.from(this.tableName).update(row).eq("id", item.id).eq("userId", userId());
      if (error) throw error;
    } else {
      const { error } = await supabase.from(this.tableName).insert(row);
      if (error) throw error;
    }
  }

  async update(id: string, changes: Partial<T>): Promise<void> {
    const row = serializeDates(changes as Record<string, any>);
    const { error } = await supabase.from(this.tableName).update(row).eq("id", id).eq("userId", userId());
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq("id", id).eq("userId", userId());
    if (error) throw error;
  }

  async clear(): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().neq("id", "").eq("userId", userId());
    if (error) throw error;
  }

  async bulkAdd(items: T[]): Promise<void> {
    if (items.length === 0) return;
    const rows = items.map(item => serializeDates({ ...item, userId: userId() }));
    const { error } = await supabase.from(this.tableName).insert(rows);
    if (error) throw error;
  }

  async count(): Promise<number> {
    const { count, error } = await supabase.from(this.tableName).select("*", { count: "exact", head: true }).eq("userId", userId());
    if (error) throw error;
    return count || 0;
  }

  async toArray(): Promise<T[]> {
    const { data, error } = await supabase.from(this.tableName).select("*").eq("userId", userId());
    if (error) throw error;
    return (data || []).map(deserializeDates<T>);
  }

  where(index: string): SupabaseCollection<T> {
    return new SupabaseCollection<T>(this.tableName, [{ col: index, op: "where", value: undefined! }]);
  }

  orderBy(index: string): SupabaseCollection<T> {
    return new SupabaseCollection<T>(this.tableName, [], index, true, null, null);
  }

  filter(predicate: (item: T) => boolean): SupabaseCollection<T> {
    return new SupabaseCollection<T>(this.tableName, [], null, true, null, predicate);
  }
}

// ── DB proxy ──

export const supabaseProxy = {
  lifeDomains: new SupabaseTable<LifeDomain>("lifeDomains"),
  topics: new SupabaseTable<Topic>("topics"),
  diaries: new SupabaseTable<Diary>("diaries"),
  analysisResults: new SupabaseTable<AnalysisResult>("analysisResults"),
  events: new SupabaseTable<Event>("events"),
  insights: new SupabaseTable<Insight>("insights"),

  async delete() {
    for (const name of ["diaries", "topics", "lifeDomains", "analysisResults", "events", "insights"]) {
      const t = new SupabaseTable(name);
      await t.clear();
    }
  },

  async open() {
    // Supabase is connectionless, just check auth
    if (!_userId) throw new Error("Not authenticated");
  },

  close() { /* noop */ },

  async transaction(_mode: string, ...args: any[]) {
    // Last arg is the callback
    const fn = args[args.length - 1];
    if (typeof fn === "function") return fn();
    return undefined;
  },

  on(_event: string, cb: Function) {
    // noop for compatibility; event registrations are silently ignored
  },
};
