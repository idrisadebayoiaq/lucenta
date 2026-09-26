import { cn } from "@/lib/utils";

export function AiGauge({ probability, size = 140, caption }: { probability: number; size?: number; caption?: string }) {
  const pct = Math.round(probability * 100);
  const color = probability < 0.3 ? "text-emerald-500" : probability < 0.7 ? "text-amber-500" : "text-rose-500";
  const radius = (size - 14) / 2;
  const half = Math.PI * radius;
  return (
    <div className="flex flex-col items-center">
      <div className={cn("relative", color)} style={{ width: size, height: size / 2 + 10 }}>
        <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
          <path
            d={`M 7 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 7} ${size / 2}`}
            className="fill-none stroke-muted"
            strokeWidth={12}
            strokeLinecap="round"
          />
          <path
            d={`M 7 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 7} ${size / 2}`}
            className="fill-none stroke-current transition-all duration-700"
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={half}
            strokeDashoffset={half * (1 - probability)}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <span className="text-3xl font-bold text-foreground">{pct}%</span>
        </div>
      </div>
      {caption && <p className="mt-1 text-sm text-muted-foreground">{caption}</p>}
    </div>
  );
}

export const LABELS = {
  likely_human: { text: "Likely human-written", tone: "success" },
  mixed: { text: "Mixed / uncertain", tone: "warning" },
  likely_ai: { text: "Likely AI-generated", tone: "danger" },
} as const;
