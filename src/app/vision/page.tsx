"use client";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2, AlertCircle, FileText } from "lucide-react";
import { useVision } from "@/hooks/useVision";
import { useInit } from "@/components/InitProvider";
import VisionArticle from "@/components/VisionArticle";
import SunburstWheel from "@/components/SunburstWheel";
import { db } from "@/lib/db";
import EmptyState from "@/components/EmptyState";

export default function VisionPage() {
  const { ready } = useInit();
  const { article, baselines, generating, error, generateVision } = useVision();

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href="/" className="flex items-center gap-1 text-sm text-calm-400 hover:text-calm-600">
        <ArrowLeft className="w-4 h-4" /> 返回
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-serif font-semibold text-calm-900">人生展望</h1>
        <button
          onClick={generateVision}
          disabled={generating}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-full text-xs font-medium hover:bg-primary-700 disabled:opacity-40 transition-all active:scale-95"
        >
          {generating ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 生成中...</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> 生成展望</>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {!article && baselines.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="开始你的人生展望"
          description="在「人生理想」课题下写日记，记录你对未来的想法，然后点击「生成展望」让 AI 帮你整理成一篇文章"
          actionLabel="去写日记"
          actionHref="/"
        />
      ) : (
        <>
          {article && <VisionArticle article={article} />}

          <div className="bg-white rounded-2xl border border-calm-200 p-5">
            <h3 className="text-sm font-serif font-semibold text-calm-900 mb-4 text-center">
              需要面对的课题与底线
            </h3>
            <SunburstWheel baselines={baselines} />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-serif font-semibold text-calm-900 px-1">各课题底线</h3>
            {baselines
              .filter(b => b.baseline)
              .map(b => (
                <div key={b.topicId} className="bg-white rounded-2xl border border-calm-200 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      b.status === "good" ? "bg-green-500" :
                      b.status === "warn" ? "bg-yellow-500" :
                      b.status === "bad" ? "bg-red-500" : "bg-gray-300"
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-calm-800">{b.topicName}</p>
                      <p className="text-xs text-calm-400 mt-0.5">{b.baseline}</p>
                    </div>
                  </div>
                  <Link
                    href={`/topics/${b.topicId}`}
                    className="text-xs text-primary-500 hover:text-primary-600 shrink-0 ml-3"
                  >
                    去课题
                  </Link>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
