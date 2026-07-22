import { NextRequest, NextResponse } from "next/server";
import { runTrendAnalysis } from "@/lib/ai/trend-pipeline";
import type { AnalysisResult, Diary, Event, Insight } from "@/types";

function parseDates<T extends { createdAt: Date }>(row: any): T {
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = v;
    if ((k === "createdAt" || k === "updatedAt") && typeof v === "string") {
      out[k] = new Date(v);
    }
  }
  return out as T;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scope, diaries, analyses, events, insights, topics } = body;

    if (!scope || !diaries) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const parsedDiaries: Diary[] = (diaries || []).map(parseDates<Diary>);
    const parsedAnalyses: AnalysisResult[] = (analyses || []).map(parseDates<AnalysisResult>);
    const parsedEvents: Event[] = (events || []).map(parseDates<Event>);
    const parsedInsights: Insight[] = (insights || []).map(parseDates<Insight>);

    const analysisMap = new Map(parsedAnalyses.map((a: AnalysisResult) => [a.diaryId, a]));

    const result = await runTrendAnalysis(scope, {
      diaries: parsedDiaries,
      analyses: analysisMap,
      events: parsedEvents,
      insights: parsedInsights,
      topics: topics || [],
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/trend]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "分析失败" },
      { status: 500 },
    );
  }
}
