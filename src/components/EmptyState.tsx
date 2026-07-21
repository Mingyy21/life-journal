"use client";
import Link from "next/link";

interface Props {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, actionHref, onAction }: Props) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 text-calm-300 mx-auto mb-3 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-sm text-calm-500">{title}</p>
      {description && <p className="text-xs text-calm-400 mt-1">{description}</p>}
      {actionLabel && (actionHref ? (
        <Link href={actionHref} className="inline-block mt-3 px-4 py-2 text-sm font-medium rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors active:scale-95">
          {actionLabel}
        </Link>
      ) : (
        <button onClick={onAction} className="mt-3 px-4 py-2 text-sm font-medium rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors active:scale-95">
          {actionLabel}
        </button>
      ))}
    </div>
  );
}
