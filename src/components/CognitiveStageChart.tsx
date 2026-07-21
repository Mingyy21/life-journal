"use client";
import type { EvolutionPoint, CognitiveStage } from "@/hooks/useCognitiveEvolution";

const STAGE_LABELS: CognitiveStage[] = ["觉察", "接纳", "理解", "重构", "行动"];
const STAGE_COLORS: Record<CognitiveStage, string> = {
  "觉察": "#94A3B8",
  "接纳": "#6BCB77",
  "理解": "#4ECDC4",
  "重构": "#FF9F43",
  "行动": "#FF6B6B",
};

function formatDate(d: Date) { return `${d.getMonth() + 1}/${d.getDate()}`; }

interface Props {
  points: EvolutionPoint[];
  width?: number;
  height?: number;
}

export default function CognitiveStageChart({ points, width = 600, height = 200 }: Props) {
  if (points.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-calm-200 p-8 text-center">
        <p className="text-calm-400 text-sm">该课题下没有足够的数据来生成认知演化图</p>
        <p className="text-calm-300 text-xs mt-1">写更多日记后，这里会展示你的成长轨迹</p>
      </div>
    );
  }

  if (points.length === 1) {
    return (
      <div className="bg-white rounded-xl border border-calm-200 p-8 text-center">
        <p className="text-calm-400 text-sm">只有一篇日记</p>
        <p className="text-calm-300 text-xs mt-1">继续记录才能看到认知阶段的演化趋势</p>
      </div>
    );
  }

  const padLeft = 36;
  const padRight = 16;
  const padTop = 10;
  const padBottom = 24;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const stageH = chartH / (STAGE_LABELS.length - 1);

  const xForIndex = (i: number) => padLeft + (i / Math.max(points.length - 1, 1)) * chartW;
  const yForStage = (stageIndex: number) => padTop + (STAGE_LABELS.length - 1 - stageIndex) * stageH;

  // Build step-line path
  let pathD = "";
  for (let i = 0; i < points.length; i++) {
    const x = xForIndex(i);
    const y = yForStage(points[i].stageIndex);
    if (i === 0) {
      pathD = `M ${x} ${y}`;
    } else {
      const prevX = xForIndex(i - 1);
      const prevY = yForStage(points[i - 1].stageIndex);
      pathD += ` L ${x} ${prevY} L ${x} ${y}`;
    }
  }

  return (
    <div className="bg-white rounded-xl border border-calm-200 p-5 overflow-x-auto">
      <h3 className="text-sm font-medium text-calm-700 mb-4">认知阶段演化</h3>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ minWidth: width }}>
        {/* Y axis grid lines */}
        {STAGE_LABELS.map((stage, i) => (
          <g key={stage}>
            <line x1={padLeft} y1={yForStage(i)} x2={width - padRight} y2={yForStage(i)} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={padLeft - 6} y={yForStage(i)} textAnchor="end" dominantBaseline="middle" fill="#94A3B8" style={{ fontSize: 10 }}>
              {stage}
            </text>
          </g>
        ))}

        {/* Step line */}
        <path d={pathD} fill="none" stroke="#0d9488" strokeWidth={2} strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => {
          const x = xForIndex(i);
          const y = yForStage(p.stageIndex);
          return (
            <g key={p.diaryId}>
              <circle cx={x} cy={y} r={4} fill={STAGE_COLORS[p.stage]} stroke="#fff" strokeWidth={1.5} />
              <title>{`${p.diaryTitle} — ${p.stage} (${formatDate(p.date)})`}</title>
            </g>
          );
        })}

        {/* X axis labels */}
        {points.length <= 12 ? points.map((p, i) => (
          <text key={`xl-${i}`} x={xForIndex(i)} y={height - 4} textAnchor="middle" fill="#94A3B8" style={{ fontSize: 9 }}>
            {formatDate(p.date)}
          </text>
        )) : (
          <>
            <text x={xForIndex(0)} y={height - 4} textAnchor="start" fill="#94A3B8" style={{ fontSize: 9 }}>{formatDate(points[0].date)}</text>
            <text x={xForIndex(points.length - 1)} y={height - 4} textAnchor="end" fill="#94A3B8" style={{ fontSize: 9 }}>{formatDate(points[points.length - 1].date)}</text>
          </>
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {STAGE_LABELS.map(stage => (
          <div key={stage} className="flex items-center gap-1 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} />
            <span className="text-calm-500">{stage}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
