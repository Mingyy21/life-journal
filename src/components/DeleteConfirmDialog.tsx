"use client";
import { AlertTriangle } from "lucide-react";

interface Props {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmDialog({ title, message, onConfirm, onCancel }: Props) {
  return (
    <div className="bg-red-50 rounded-xl p-4 border border-red-100 text-center">
      <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-2" />
      <p className="text-sm font-medium text-red-500 mb-1">{title}</p>
      <p className="text-xs text-red-400 mb-3">{message}</p>
      <div className="flex items-center justify-center gap-2">
        <button onClick={onCancel} className="px-4 py-1.5 text-xs font-medium rounded-full bg-white text-calm-500 border border-calm-200 hover:bg-calm-50">取消</button>
        <button onClick={onConfirm} className="px-4 py-1.5 text-xs font-medium rounded-full bg-red-500 text-white hover:bg-red-600">确认删除</button>
      </div>
    </div>
  );
}
