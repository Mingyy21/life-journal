"use client";
import Link from "next/link";
import { AlertTriangle, Lightbulb, TrendingUp, X, ArrowRight } from "lucide-react";

export interface PatternAlertData {
  type: "warning" | "similar_situation" | "milestone";
  topicName?: string;
  message: string;
  suggestion?: string;
  link?: string;
}

interface Props {
  alerts: PatternAlertData[];
  onDismiss?: (index: number) => void;
}

const ICONS = {
  warning: { Icon: AlertTriangle, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", iconColor: "text-amber-500" },
  similar_situation: { Icon: Lightbulb, bg: "bg-primary-50", border: "border-primary-200", text: "text-primary-700", iconColor: "text-primary-500" },
  milestone: { Icon: TrendingUp, bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", iconColor: "text-emerald-500" },
};

export default function PatternAlert({ alerts, onDismiss }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, idx) => {
        const style = ICONS[alert.type];
        const { Icon } = style;
        return (
          <div key={idx} className={`${style.bg} ${style.border} border rounded-xl p-3 flex items-start gap-3`}>
            <Icon className={`w-4 h-4 ${style.iconColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs ${style.text} leading-relaxed`}>{alert.message}</p>
              {alert.suggestion && (
                <p className="text-xs text-calm-400 mt-1">{alert.suggestion}</p>
              )}
              {alert.link && (
                <Link href={alert.link}
                  className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-calm-500 hover:text-calm-700 transition-colors">
                  去看看 <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
            {onDismiss && (
              <button onClick={() => onDismiss(idx)} className="text-calm-300 hover:text-calm-500 flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
