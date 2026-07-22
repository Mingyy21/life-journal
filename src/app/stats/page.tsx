"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, BookOpen, PieChart, Trophy, BarChart3 } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { db } from "@/lib/db";
import EmotionPetalChart from "@/components/EmotionPetalChart";
import TrendReportCard, { type TrendCardReport } from "@/components/TrendReportCard";
import { aggregateWeeklyEmotions } from "@/hooks/useWeeklyEmotions";
import { detectGrowthMilestones, type GrowthMilestone } from "@/lib/pattern-store";
import { useTopics, useAllDiaries, useEvents, useInsights } from "@/hooks/useData";
import { useInit } from "@/components/InitProvider";
import type { AnalysisResult } from "@/types";

function formatDate(d: Date) { return `${d.getMonth() + 1}/${d.getDate()}`; }

export default function StatsPage() {
  const router = useRouter();
  const { ready } = useInit();
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [milestones, setMilestones] = useState<GrowthMilestone[]>([]);
  const [trendReports, setTrendReports] = useState<Record<string, { loading: boolean; report: TrendCardReport | null; error: string | null }>>({});

  const { data: diaries = [], isLoading: diariesLoading } = useAllDiaries();
  const { data: topics = [], isLoading: topicsLoading } = useTopics();
  const { data: events = [], isLoading: eventsLoading } = useEvents();
  const { data: insights = [], isLoading: insightsLoading } = useInsights();

  // 分析结果没有在 useData 中提供 hook，手动加载一次
  useEffect(() => {
    db.analysisResults.toArray()
      .then(setAnalyses)
      .catch(() => {})
      .finally(() => setAnalysesLoading(false));
  }, []);

  // 检测成长里程碑（异步，不阻塞UI）
  useEffect(() => {
    detectGrowthMilestones().then(setMilestones).catch(() => {});
  }, []);

  const loading = !ready || diariesLoading || topicsLoading || eventsLoading || insightsLoading || analysesLoading;

  // ── 派生状态（useMemo） ──

  // 本周情绪花瓣
  const weeklyEmotions = useMemo(() => {
    if (diaries.length === 0 || analyses.length === 0) return null;
    const aMap = new Map(analyses.map(a => [a.diaryId, a]));
    return aggregateWeeklyEmotions(diaries, aMap);
  }, [diaries, analyses]);

  // 各时间范围是否有数据
  const hasData = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    return {
      weekly: diaries.some(d => d.createdAt >= weekStart),
      monthly: diaries.some(d => d.createdAt >= monthStart),
      yearly: diaries.some(d => d.createdAt >= yearStart),
    };
  }, [diaries]);

  // 写作频率（按天）
  const { freqEntries, maxFreq } = useMemo(() => {
    const fbd: Record<string, number> = {};
    diaries.forEach(d => { const k = d.createdAt.toISOString().slice(0, 10); fbd[k] = (fbd[k] || 0) + 1; });
    return {
      freqEntries: Object.entries(fbd).sort((a, b) => a[0].localeCompare(b[0])),
      maxFreq: Math.max(1, ...Object.values(fbd)),
    };
  }, [diaries]);

  const totalWords = useMemo(() => diaries.reduce((s, d) => s + d.wordCount, 0), [diaries]);
  const avgWords = useMemo(() => diaries.length > 0 ? Math.round(totalWords / diaries.length) : 0, [diaries, totalWords]);

  // 情绪趋势（从分析结果中提取）
  const emotionTrend = useMemo(() => {
    const aMap = new Map(analyses.map(a => [a.diaryId, a]));
    return diaries
      .filter(d => aMap.has(d.id))
      .map(d => ({ date: d.createdAt.toISOString().slice(0, 10), valence: aMap.get(d.id)!.vadScore.valence, emotion: aMap.get(d.id)!.primaryEmotion }))
      .slice(-30);
  }, [diaries, analyses]);

  // 课题分布
  const { topicEntries, maxTopic } = useMemo(() => {
    const tc: Record<string, number> = {};
    diaries.forEach(d => {
      (d.topicIds || []).forEach(tid => {
        const t = topics.find(x => x.id === tid);
        if (t) tc[t.name] = (tc[t.name] || 0) + 1;
      });
    });
    const entries = Object.entries(tc).sort((a, b) => b[1] - a[1]);
    return { topicEntries: entries, maxTopic: Math.max(1, ...entries.map(([, c]) => c)) };
  }, [diaries, topics]);

  // 解决状态分布（基于事件）
  const statusCount = useMemo(() => {
    const sc: Record<string, number> = {};
    events.forEach(e => { sc[e.resolutionStatus] = (sc[e.resolutionStatus] || 0) + 1; });
    return sc;
  }, [events]);
  const statusLabels: Record<string, string> = { unresolved: "刚开始", in_progress: "解决中", avoiding: "逃避中", accepted: "无法解决", resolved: "已解决" };
  const statusColors: Record<string, string> = { unresolved: "#E65100", in_progress: "#1565C0", avoiding: "#7B1FA2", accepted: "#546E7A", resolved: "#2E7D32" };
  const totalEvents = events.length || 1;

  // 写作频率（按周）
  const { weekEntries, maxWeek } = useMemo(() => {
    const w: Record<string, number> = {};
    diaries.forEach(d => {
      const d2 = new Date(d.createdAt);
      const ws = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate() - d2.getDay());
      const wk = ws.toISOString().slice(0, 10);
      w[wk] = (w[wk] || 0) + 1;
    });
    const entries = Object.entries(w).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
    return { weekEntries: entries, maxWeek: Math.max(1, ...entries.map(([, c]) => c)) };
  }, [diaries]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-primary-300 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-calm-400 hover:text-calm-600"><ArrowLeft className="w-4 h-4" /> 返回</button>
      <h1 className="text-lg font-serif font-semibold text-calm-900">数据统计</h1>

      {/* 概览卡片 */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-primary-50/40 to-white rounded-xl border border-calm-200 p-5 shadow-card text-center">
          <BookOpen className="w-5 h-5 text-primary-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-calm-800">{diaries.length}</p>
          <p className="text-xs text-calm-400">总日记</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50/40 to-white rounded-xl border border-calm-200 p-5 shadow-card text-center">
          <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-calm-800">{totalWords.toLocaleString()}</p>
          <p className="text-xs text-calm-400">总字数</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50/40 to-white rounded-xl border border-calm-200 p-5 shadow-card text-center">
          <PieChart className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-calm-800">{avgWords}</p>
          <p className="text-xs text-calm-400">平均字数/篇</p>
        </div>
      </div>

      {/* 本周情绪花瓣 */}
      {weeklyEmotions && (
        <div className="bg-gradient-to-br from-primary-50/30 to-white rounded-xl border border-calm-200 p-5 shadow-card">
          <h3 className="text-sm font-medium text-calm-700 mb-3">本周情绪花瓣</h3>
          <EmotionPetalChart scores={weeklyEmotions} />
        </div>
      )}

      {/* 写作频率—每日 */}
      {freqEntries.length > 0 && (
        <div className="bg-white rounded-xl border border-calm-200 p-5">
          <h3 className="text-sm font-medium text-calm-700 mb-3">每日写作频率</h3>
          <div className="flex items-end gap-0.5 h-24 overflow-x-auto">
            {freqEntries.slice(-60).map(([date, count]) => (
              <div key={date} className="flex-1 flex flex-col items-center justify-end min-w-[6px]" title={`${date}: ${count}篇`}>
                <span className="text-[10px] text-calm-400 mb-0.5 leading-none">{count}</span>
                <div className="w-full rounded-t-sm bg-primary-400/60 hover:bg-primary-400 transition-colors" style={{ height: `${(count / maxFreq) * 100}%`, minHeight: count > 0 ? 4 : 0 }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-calm-400">
            <span>{freqEntries[0]?.[0] || ""}</span>
            <span>{freqEntries[freqEntries.length - 1]?.[0] || ""}</span>
          </div>
        </div>
      )}

      {/* 每周趋势 */}
      {weekEntries.length > 0 && (
        <div className="bg-white rounded-xl border border-calm-200 p-5">
          <h3 className="text-sm font-medium text-calm-700 mb-3">每周写作趋势（近12周）</h3>
          <div className="space-y-1">
            {weekEntries.map(([week, count]) => (
              <div key={week} className="flex items-center gap-2">
                <span className="text-xs text-calm-400 w-24 flex-shrink-0">{formatDate(new Date(week))}</span>
                <div className="flex-1 h-5 bg-calm-50 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-300 rounded-full transition-all" style={{ width: `${(count / maxWeek) * 100}%` }} />
                </div>
                <span className="text-xs text-calm-500 w-8 text-right">{count}篇</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 情绪趋势 */}
      {emotionTrend.length > 0 && (
        <div className="bg-white rounded-xl border border-calm-200 p-5">
          <h3 className="text-sm font-medium text-calm-700 mb-3">情绪趋势（近30篇）</h3>
          <div className="flex items-end gap-0.5 h-20 overflow-x-auto">
            {emotionTrend.map(({ date, valence }) => {
              const h = ((valence + 1) / 2) * 100;
              const color = valence > 0.2 ? "#4ECDC4" : valence < -0.2 ? "#FF6B6B" : "#DDA0DD";
              return <div key={date} className="flex-1 flex flex-col items-center min-w-[8px]" title={`${date}: ${valence.toFixed(2)}`}>
                <div className="w-full rounded-t-sm transition-colors" style={{ height: `${h}%`, minHeight: 4, backgroundColor: color }} />
              </div>;
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-calm-400">
            <span className="text-red-400">负向</span>
            <span className="text-calm-400">中性</span>
            <span className="text-emerald-400">正向</span>
          </div>
        </div>
      )}

      {/* 课题分布 */}
      {topicEntries.length > 0 && (
        <div className="bg-white rounded-xl border border-calm-200 p-5">
          <h3 className="text-sm font-medium text-calm-700 mb-3">课题分布</h3>
          <div className="space-y-2">
            {topicEntries.map(([name, count]) => {
              const t = topics.find(x => x.name === name);
              return (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-xs text-calm-600 w-12 flex-shrink-0">{name}</span>
                  <div className="flex-1 h-5 bg-calm-50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(count / maxTopic) * 100}%`, backgroundColor: t?.color || "#94A3B8" }} />
                  </div>
                  <span className="text-xs text-calm-500 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 解决状态分布 */}
      <div className="bg-white rounded-xl border border-calm-200 p-5">
        <h3 className="text-sm font-medium text-calm-700 mb-3">解决状态分布</h3>
        <div className="flex h-6 rounded-full overflow-hidden">
          {Object.entries(statusCount).map(([status, count]) => (
            <div key={status} title={`${statusLabels[status]}: ${count}`} style={{ width: `${(count / totalEvents) * 100}%`, backgroundColor: statusColors[status] || "#94A3B8" }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {Object.entries(statusCount).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColors[status] }} />
              <span className="text-calm-500">{statusLabels[status] || status}</span>
              <span className="text-calm-400">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {diaries.length === 0 && (
        <EmptyState icon={<BarChart3 className="w-16 h-16" />} title="还没有数据" description="写日记后，这里会展示你的数据统计" actionLabel="开始写日记" actionHref="/" />
      )}

      {/* 成长里程碑 */}
      {milestones.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-50/30 to-white rounded-xl border border-emerald-200 p-5 shadow-card">
          <h3 className="text-sm font-medium text-calm-700 mb-3">成长里程碑</h3>
          <div className="space-y-3">
            {milestones.slice(0, 3).map((m, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl">
                <Trophy className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-700">{m.topicName}</p>
                  <p className="text-xs text-calm-500 mt-0.5">
                    认知路径：<span className="font-medium text-emerald-600">{m.stages.join(" → ")}</span>
                  </p>
                  <p className="text-xs text-calm-400 mt-0.5">
                    历时 {m.totalDays} 天 · 最后行动记录：{m.lastActionDiary.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI趋势报告 */}
      <div className="space-y-3 mt-4">
        <h2 className="text-sm font-medium text-calm-700">AI 趋势报告</h2>
        {(["weekly", "monthly", "yearly"] as const).map(scope => {
          const labels: Record<string, string> = { weekly: "本周", monthly: "本月", yearly: "年度" };
          const tr = trendReports[scope];

          const handleGenerate = async () => {
            setTrendReports(prev => ({ ...prev, [scope]: { loading: true, report: null, error: null } }));
            try {
              const res = await fetch("/api/trend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  scope,
                  diaries,
                  analyses,
                  events,
                  insights,
                  topics: topics.map(t => ({ id: t.id, name: t.name, color: t.color })),
                }),
              });
              if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `请求失败 (${res.status})`);
              }
              const result = await res.json();
              let sections: TrendCardReport["sections"] = [];
              if (result.usedLLM && result.report) {
                sections = Object.entries(result.report)
                  .filter(([k]) => k !== "message" && k !== "error")
                  .map(([k, v]) => ({
                    heading: k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()),
                    content: typeof v === "string" ? v : JSON.stringify(v),
                  }));
              } else if (result.report?.message) {
                sections = [{ heading: "说明", content: String(result.report.message) }];
              }
              setTrendReports(prev => ({
                ...prev,
                [scope]: { loading: false, report: { title: labels[scope] + "回顾", sections }, error: null },
              }));
            } catch (e) {
              setTrendReports(prev => ({
                ...prev,
                [scope]: { loading: false, report: null, error: e instanceof Error ? e.message : "生成失败" },
              }));
            }
          };

          return (
            <TrendReportCard
              key={scope}
              scope={scope}
              label={labels[scope]}
              hasData={hasData[scope]}
              loading={tr?.loading || false}
              report={tr?.report || null}
              error={tr?.error || null}
              onGenerate={handleGenerate}
            />
          );
        })}
      </div>
    </div>
  );
}
