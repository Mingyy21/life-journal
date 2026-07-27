"use client";
import { useMemo, useState } from "react";
import type { BaselineData } from "@/hooks/useVision";

interface Props {
  baselines: BaselineData[];
  onCenterClick?: () => void;
}

const INNER_R = 28;
const LAYER1_R = 56;
const LAYER2_R = 82;
const LAYER3_R = 110;
const PADDING = 2;

export default function SunburstWheel({ baselines, onCenterClick }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  const sectors = useMemo(() => {
    const total = baselines.length;
    if (total === 0) return [];

    const maxDiary = Math.max(...baselines.map(b => b.diaryCount), 1);
    return baselines.map((b, i) => {
      const angle = 360 / total;
      const startAngle = (i * angle - 90) * (Math.PI / 180);
      const endAngle = ((i + 1) * angle - 90) * (Math.PI / 180);

      const statusColor =
        b.status === "good" ? "#22c55e" :
        b.status === "warn" ? "#eab308" :
        b.status === "bad" ? "#ef4444" : "#d1d5db";

      const activityRatio = b.diaryCount / maxDiary;

      return { ...b, startAngle, endAngle, angle, statusColor, activityRatio };
    });
  }, [baselines]);

  const polarToCart = (cx: number, cy: number, r: number, angle: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  const arcPath = (cx: number, cy: number, r1: number, r2: number, a1: number, a2: number) => {
    const p1 = polarToCart(cx, cy, r1, a1);
    const p2 = polarToCart(cx, cy, r1, a2);
    const p3 = polarToCart(cx, cy, r2, a2);
    const p4 = polarToCart(cx, cy, r2, a1);
    const largeArc = a2 - a1 > Math.PI ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${r1} ${r1} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${r2} ${r2} 0 ${largeArc} 0 ${p4.x} ${p4.y} Z`;
  };

  const cx = LAYER3_R + 10;
  const cy = LAYER3_R + 10;
  const size = (LAYER3_R + 10) * 2;

  if (sectors.length === 0) return null;

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} className="select-none">
        {/* 中心圆 — 点击弹出展望 */}
        <circle cx={cx} cy={cy} r={INNER_R} fill="#DDA0DD" className="cursor-pointer hover:opacity-80 transition-opacity" onClick={onCenterClick} />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" className="pointer-events-none" onClick={onCenterClick}>人生</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" className="pointer-events-none" onClick={onCenterClick}>愿景</text>

        {/* 扇区三环 */}
        {sectors.map((s, i) => {
          const midAngle = (s.startAngle + s.endAngle) / 2;
          const isHovered = hovered === i;

          // 内层：课题名
          const labelR = (INNER_R + LAYER1_R) / 2;
          const lp = polarToCart(cx, cy, labelR, midAngle);

          // 中层：底线状态（全填充颜色）
          // 外层：活跃度（按比例填充）
          const actEndAngle = s.startAngle + (s.endAngle - s.startAngle) * s.activityRatio;

          return (
            <g
              key={s.topicId}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
              opacity={hovered === null || isHovered ? 1 : 0.5}
            >
              {/* 内层环：课题颜色 */}
              <path d={arcPath(cx, cy, INNER_R + PADDING, LAYER1_R - PADDING, s.startAngle, s.endAngle)}
                fill="#e2e8f0" stroke="white" strokeWidth={1} />
              <text x={lp.x} y={lp.y + 3} textAnchor="middle" fill="#475569" fontSize="9" fontWeight="500"
                transform={`rotate(${s.angle / 2 + i * s.angle - 90}, ${lp.x}, ${lp.y})`}>
                {s.topicName.length > 3 ? s.topicName.slice(0, 3) : s.topicName}
              </text>

              {/* 中层环：底线符合度 */}
              <path d={arcPath(cx, cy, LAYER1_R + PADDING, LAYER2_R - PADDING, s.startAngle, s.endAngle)}
                fill={s.statusColor} stroke="white" strokeWidth={1} opacity={0.85} />

              {/* 外层环：活跃度（按比例填充） */}
              <path d={arcPath(cx, cy, LAYER2_R + PADDING, LAYER3_R - PADDING, s.startAngle, s.endAngle)}
                fill="#f1f5f9" stroke="white" strokeWidth={1} />
              {s.activityRatio > 0 && (
                <path d={arcPath(cx, cy, LAYER2_R + PADDING, LAYER3_R - PADDING, s.startAngle, actEndAngle)}
                  fill="#a78bfa" stroke="white" strokeWidth={1} opacity={0.6} />
              )}

              {/* tooltip */}
              {isHovered && (
                <>
                  <rect x={cx - 60} y={LAYER3_R + 16} width={120} height={52} rx={8} fill="white" stroke="#e2e8f0" strokeWidth={1} />
                  <text x={cx} y={LAYER3_R + 32} textAnchor="middle" fill="#1e293b" fontSize="10" fontWeight="bold">{s.topicName}</text>
                  <text x={cx} y={LAYER3_R + 46} textAnchor="middle" fill="#64748b" fontSize="9">
                    底线: {s.status === "good" ? "符合" : s.status === "warn" ? "接近" : s.status === "bad" ? "偏离" : "未设定"}
                  </text>
                  <text x={cx} y={LAYER3_R + 58} textAnchor="middle" fill="#64748b" fontSize="9">
                    {s.diaryCount} 篇日记
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
