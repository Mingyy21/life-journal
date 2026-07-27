"use client";
import { useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";
import type { Insight } from "@/types";

interface Props {
  article: Insight | null;
  onSave?: (content: string) => Promise<void>;
}

export default function VisionArticle({ article, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  if (!article) return null;

  const handleEdit = () => {
    setEditContent(article.content);
    setEditing(true);
  };

  const handleSave = async () => {
    await onSave?.(editContent);
    setEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-calm-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-serif font-semibold text-calm-900">
          📖 {article.title}
        </h2>
        <div className="flex items-center gap-2">
          {!editing && (
            <button onClick={handleEdit}
              className="text-xs px-3 py-1.5 rounded-full bg-calm-50 text-calm-500 hover:bg-calm-100 transition-colors">
              编辑
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={15}
            className="w-full text-sm text-calm-700 border border-calm-200 rounded-xl p-3 outline-none focus:border-primary-300 resize-y"
          />
          <div className="flex items-center gap-2">
            <button onClick={handleSave}
              className="px-4 py-1.5 text-xs font-medium rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors">
              保存修改
            </button>
            <button onClick={() => setEditing(false)}
              className="px-4 py-1.5 text-xs font-medium rounded-full bg-calm-50 text-calm-500 hover:bg-calm-100 transition-colors">
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-calm-700 leading-relaxed">
          <MarkdownRenderer content={article.content} />
        </div>
      )}
    </div>
  );
}
