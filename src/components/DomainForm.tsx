"use client";
import { useState } from "react";
import { X, Save } from "lucide-react";
import type { LifeDomain } from "@/types";

const COLOR_PRESETS = ["#4ECDC4", "#FF6B6B", "#45B7D1", "#FFEAA7", "#DDA0DD", "#96CEB4", "#FFA94D", "#7C5CFC"];

interface Props {
  initialValues?: LifeDomain | null;
  onSave: (input: { name: string; color: string; icon: string; description: string }) => Promise<void>;
  onCancel: () => void;
}

export default function DomainForm({ initialValues, onSave, onCancel }: Props) {
  const [name, setName] = useState(initialValues?.name || "");
  const [color, setColor] = useState(initialValues?.color || COLOR_PRESETS[0]);
  const [description, setDescription] = useState(initialValues?.description || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave({ name: name.trim(), color, icon: "Folder", description: description.trim() }); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-calm-200 p-5">
      <h3 className="text-sm font-medium text-calm-800 mb-3">{initialValues ? "编辑领域" : "新建领域"}</h3>
      <input type="text" value={name} onChange={e => setName(e.target.value)}
        placeholder="领域名称" className="w-full text-sm border border-calm-200 rounded-lg px-3 py-2 mb-3 text-calm-700 placeholder-calm-300 focus:outline-none focus:border-primary-300" />
      <div className="mb-3">
        <p className="text-xs text-calm-400 mb-1.5">颜色</p>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-1 ring-calm-400 scale-110" : "hover:scale-105"}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <input type="text" value={description} onChange={e => setDescription(e.target.value)}
        placeholder="描述（可选）" className="w-full text-sm border border-calm-200 rounded-lg px-3 py-2 mb-4 text-calm-700 placeholder-calm-300 focus:outline-none focus:border-primary-300" />
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-calm-400 hover:text-calm-600 bg-calm-50 rounded-lg"><X className="w-4 h-4" /> 取消</button>
        <button onClick={handleSave} disabled={!name.trim() || saving}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40">
          <Save className="w-4 h-4" /> 保存
        </button>
      </div>
    </div>
  );
}
