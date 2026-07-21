"use client";
import type { EmotionLabels } from "@/types";

interface EmotionConfig {
  key: keyof EmotionLabels;
  label: string;
  color: string;
  angle: number; // degrees from top, clockwise
  positive: boolean;
}

const EMOTION_CONFIGS: EmotionConfig[] = [
  { key: "joy", label: "喜悦", color: "#FFD93D", angle: 0, positive: true },
  { key: "trust", label: "信任", color: "#6BCB77", angle: 45, positive: true },
  { key: "fear", label: "恐惧", color: "#9B59B6", angle: 90, positive: false },
  { key: "surprise", label: "惊讶", color: "#FF9F43", angle: 135, positive: true },
  { key: "sadness", label: "悲伤", color: "#54A0FF", angle: 180, positive: false },
  { key: "disgust", label: "厌恶", color: "#A29BFE", angle: 225, positive: false },
  { key: "anger", label: "愤怒", color: "#FF6B6B", angle: 270, positive: false },
  { key: "anticipation", label: "期待", color: "#FECA57", angle: 315, positive: true },
];

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = toRad(angleDeg - 90);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

interface Props {
  scores: EmotionLabels;
  size?: number;
  className?: string;
}

export default function EmotionPetalChart({ scores, size = 280, className = "" }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 24;
  const spread = 26; // petal spread angle in degrees

  const allZero = Object.values(scores).every(v => v === 0);

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="mx-auto">
        {/* subtle grid circles */}
        {[0.25, 0.5, 0.75].map(pct => (
          <circle key={pct} cx={cx} cy={cy} r={maxR * pct} fill="none" stroke="#e2e8f0" strokeWidth={0.5} strokeDasharray="3,3" />
        ))}

        {allZero ? (
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="fill-calm-400" style={{ fontSize: 12 }}>
            本周暂无情绪数据
          </text>
        ) : (
          EMOTION_CONFIGS.map(config => {
            const score = scores[config.key];
            if (score <= 0) return null;
            const r = Math.max(score * maxR, maxR * 0.08);
            const tip = polarToCartesian(cx, cy, r, config.angle);
            const cp1 = polarToCartesian(cx, cy, r * 0.6, config.angle - spread / 2);
            const cp2 = polarToCartesian(cx, cy, r * 0.6, config.angle + spread / 2);

            let pathD: string;
            if (config.positive) {
              // Rounded petal: quadratic bezier
              pathD = `M ${cx} ${cy} Q ${cp1.x} ${cp1.y} ${tip.x} ${tip.y} Q ${cp2.x} ${cp2.y} ${cx} ${cy}`;
            } else {
              // Angular petal: straight lines
              const mid1 = polarToCartesian(cx, cy, r * 0.7, config.angle - spread / 2);
              const mid2 = polarToCartesian(cx, cy, r * 0.7, config.angle + spread / 2);
              pathD = `M ${cx} ${cy} L ${mid1.x} ${mid1.y} L ${tip.x} ${tip.y} L ${mid2.x} ${mid2.y} Z`;
            }

            // Label position slightly beyond the petal tip
            const labelPos = polarToCartesian(cx, cy, r + 14, config.angle);

            return (
              <g key={config.key}>
                <path
                  d={pathD}
                  fill={config.color}
                  fillOpacity={0.7}
                  stroke={config.color}
                  strokeWidth={1}
                  strokeOpacity={0.5}
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#64748B"
                  style={{ fontSize: 10 }}
                >
                  {config.label}
                </text>
              </g>
            );
          })
        )}

        {/* center dot */}
        <circle cx={cx} cy={cy} r={5} fill="#cbd5e1" />
      </svg>
    </div>
  );
}
