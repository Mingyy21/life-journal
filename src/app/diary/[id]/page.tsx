"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import Link from "next/link";
import DiaryDetail from "@/components/DiaryDetail";
import DiaryEditor from "@/components/DiaryEditor";
import AnalysisCard from "@/components/AnalysisCard";
import HistoryTrigger from "@/components/HistoryTrigger";
import InsightForm from "@/components/InsightForm";
import DailyReviewBanner from "@/components/DailyReviewBanner";
import { useDiary } from "@/hooks/useDiary";
import { db } from "@/lib/db";
import { createInsight } from "@/lib/db";
import type { Diary, AnalysisResult, Event } from "@/types";

export default function DiaryPage() {
  const params = useParams(); const router = useRouter();
  const diaryId = params.id as string;
  const { domains, topics, analyzeDiaryEntry, getDiaryAnalysis, editDiary, removeDiary } = useDiary();
  const [diary, setDiary] = useState<Diary | null>(null);
  const [linkedEvent, setLinkedEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [showInsightForm, setShowInsightForm] = useState(false);
  const [todayDiaryCount, setTodayDiaryCount] = useState(0);

  const loadDiary = async () => {
    const d = await db.diaries.get(diaryId);
    setDiary(d || null);
    if (d?.eventId) {
      const ev = await db.events.get(d.eventId);
      setLinkedEvent(ev || null);
    } else { setLinkedEvent(null); }
    if (d?.hasAnalysis) { const a = await getDiaryAnalysis(diaryId); setAnalysis(a || null); }
  };

  const loadEvents = useCallback(async () => {
    const all = await db.events.orderBy("createdAt").reverse().toArray();
    setEvents(all);
    // 统计今天日记数
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const todayDiaries = await db.diaries.where("createdAt").between(todayStart, todayEnd, true, true).toArray();
    setTodayDiaryCount(todayDiaries.length);
  }, []);

  useEffect(() => {
    async function init() { setLoading(true); await Promise.all([loadDiary(), loadEvents()]); setLoading(false); }
    init();
  }, [diaryId, getDiaryAnalysis, loadEvents]);

  const handleAnalyze = async () => {
    if (!diary) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try { const result = await analyzeDiaryEntry(diary.id); setAnalysis(result); }
    catch (e) { setAnalyzeError(e instanceof Error ? e.message : "分析失败"); }
    finally { setAnalyzing(false); }
  };

  const handleLinkEvent = async (eventId: string | null) => {
    if (!diary) return;
    await editDiary(diaryId, { eventId });
    await loadDiary();
  };

  const handleUpgradeToEvent = async () => {
    if (!diary) return;
    const firstTopicId = (diary.topicIds || [])[0] || topics[0]?.id;
    if (!firstTopicId) return;
    const eventId = crypto.randomUUID();
    await db.events.add({
      id: eventId, topicId: firstTopicId,
      title: diary.title,
      description: diary.content.slice(0, 80),
      resolutionStatus: "unresolved",
      createdAt: new Date(), updatedAt: new Date(),
    });
    await editDiary(diaryId, { eventId });
    await Promise.all([loadDiary(), loadEvents()]);
  };

  const handleEditSave = async (input: { title: string; content: string; topicIds: string[]; eventId: string | null }) => {
    await editDiary(diaryId, input);
    await loadDiary();
    setEditing(false);
  };

  const handleCreateEvent = async (input: { title: string; topicId: string }): Promise<Event | null> => {
    const eventId = crypto.randomUUID();
    await db.events.add({ id: eventId, topicId: input.topicId, title: input.title, description: "", resolutionStatus: "unresolved", createdAt: new Date(), updatedAt: new Date() });
    await loadEvents();
    const created = await db.events.get(eventId);
    return created || null;
  };

  const handleExtractInsight = (text: string) => {
    setExtractedText(text);
    setShowInsightForm(true);
  };

  const handleSaveInsight = async (input: { title: string; content: string; linkedEventIds: string[]; linkedTopicIds: string[] }) => {
    await createInsight({ ...input, sourceDiaryId: diaryId });
    setShowInsightForm(false);
    setExtractedText("");
  };

  const handleDailyReview = async (): Promise<string | null> => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const todayDiaries = await db.diaries.where("createdAt").between(todayStart, todayEnd, true, true).toArray();
    const analyses = await db.analysisResults.toArray();
    const analysisMap = new Map(analyses.map(a => [a.diaryId, a]));
    const { runTrendAnalysis } = await import("@/lib/ai/trend-pipeline");
    const result = await runTrendAnalysis("daily", {
      diaries: todayDiaries, analyses: analysisMap, events: [], insights: [],
      topics: topics.map(t => ({ id: t.id, name: t.name, color: t.color })),
    });
    if (result.report.todayMood && typeof result.report.todayMood === "string") {
      const lines: string[] = [];
      lines.push(`今天整体来说${result.report.todayMood}`);
      if (result.report.moodTrend) lines.push(`情绪趋势: ${result.report.moodTrend}`);
      if (result.report.keyMoment) lines.push(`关键瞬间: ${result.report.keyMoment}`);
      if (result.report.tomorrowTip) lines.push(`明日小建议: ${result.report.tomorrowTip}`);
      if (result.report.gratitude) lines.push(`值得感恩: ${result.report.gratitude}`);
      return lines.join("\n");
    }
    return "今日复盘生成完成，请查看数据统计页。";
  };

  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    try {
      await removeDiary(diaryId);
      router.push("/");
    } catch (e) {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>;
  if (!diary) return <div className="text-center py-16"><p className="text-calm-400 text-sm">日记不存在</p><Link href="/" className="text-primary-500 text-sm mt-2 inline-block hover:underline">返回首页</Link></div>;

  return (
    <div className="space-y-5">
      <button onClick={() => editing ? setEditing(false) : router.back()} className="flex items-center gap-1 text-sm text-calm-400 hover:text-calm-600"><ArrowLeft className="w-4 h-4" /> 返回</button>

      {editing ? (
        <DiaryEditor
          domains={domains}
          topics={topics}
          events={events}
          initialValues={{ title: diary.title, content: diary.content, topicIds: diary.topicIds || [], eventId: diary.eventId }}
          onSave={handleEditSave}
          onCreateEvent={handleCreateEvent}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <DiaryDetail
            diary={diary} topics={topics} linkedEvent={linkedEvent}
            onLinkEvent={handleLinkEvent}
            onUpgradeToEvent={handleUpgradeToEvent}
            onExtractInsight={handleExtractInsight}
            onEdit={() => setEditing(true)}
            onDelete={handleDelete}
          />

          {showInsightForm && (
            <InsightForm
              topics={topics}
              events={events}
              initialContent={extractedText}
              initialTopicIds={diary.topicIds || []}
              initialEventIds={diary.eventId ? [diary.eventId] : []}
              sourceDiaryId={diaryId}
              onSave={handleSaveInsight}
              onCancel={() => { setShowInsightForm(false); setExtractedText(""); }}
            />
          )}

          {deleteConfirm && (
            <div className="bg-red-50 rounded-2xl p-4 border border-red-100 text-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-500 mb-3">确定要删除这篇日记吗？此操作不可撤销。</p>
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setDeleteConfirm(false)} className="px-4 py-1.5 text-xs font-medium rounded-full bg-white text-calm-500 border border-calm-200 hover:bg-calm-50">取消</button>
                <button onClick={handleDelete} disabled={deleting} className="px-4 py-1.5 text-xs font-medium rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
                  {deleting ? "删除中..." : "确认删除"}
                </button>
              </div>
            </div>
          )}

          {!diary.hasAnalysis && !analyzing && !deleteConfirm && (
            <button onClick={handleAnalyze} className="w-full flex items-center justify-center gap-2 py-4 bg-primary-50 hover:bg-primary-100 rounded-2xl border border-dashed border-primary-200 text-primary-600 text-sm font-medium transition-all">
              <Sparkles className="w-4 h-4" /> AI 分析这篇日记
            </button>
          )}
          {analyzing && <div className="bg-white rounded-2xl p-8 text-center border border-calm-100"><Loader2 className="w-6 h-6 text-primary-400 animate-spin mx-auto mb-2" /><p className="text-sm text-calm-400">AI 正在分析你的日记...</p></div>}
          {analyzeError && (
            <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
              <p className="text-sm text-red-500">{analyzeError}</p>
              <button onClick={handleAnalyze} className="text-xs text-red-400 hover:text-red-500 mt-1 underline">重试</button>
            </div>
          )}
          {analysis && <AnalysisCard analysis={analysis} defaultExpanded={true} />}
          {diary && <HistoryTrigger currentDiaryId={diary.id} />}
          <DailyReviewBanner diaryCount={todayDiaryCount} onRequestReview={handleDailyReview} />
        </>
      )}
    </div>
  );
}
