import type { HTMLAttributes, ReactNode } from "react";
import { cn, scoreColor } from "@/lib/utils";

type BadgeTone = "default" | "success" | "warning" | "danger" | "info" | "outline";

const badgeTones: Record<BadgeTone, string> = {
  default: "border-primary bg-primary/10 text-primary",
  success: "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400",
  warning: "border-amber-600 bg-amber-500/10 text-amber-700 dark:border-amber-400 dark:text-amber-400",
  danger: "border-rose-600 bg-rose-500/10 text-rose-700 dark:border-rose-400 dark:text-rose-400",
  info: "border-sky-600 bg-sky-500/10 text-sky-700 dark:border-sky-400 dark:text-sky-400",
  outline: "border-ink bg-card text-foreground",
};

export function Badge({ tone = "default", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border-[1.5px] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Progress({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden bg-muted", className)}>
      <div className={cn("h-full bg-primary transition-all", barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ScoreRing({
  score,
  size = 120,
  stroke = 10,
  label,
  className,
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  className?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div className={cn("relative inline-flex items-center justify-center", scoreColor(score), className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="fill-none stroke-current transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-black text-foreground" style={{ fontSize: size * 0.28 }}>
          {Math.round(score)}
        </span>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-ink bg-card p-10 text-center">
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <p className="font-extrabold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "info", title, children }: { tone?: "info" | "warning" | "danger" | "success"; title?: string; children?: ReactNode }) {
  const tones = {
    info: "border-l-sky-500 bg-sky-500/5",
    warning: "border-l-amber-500 bg-amber-500/5",
    danger: "border-l-rose-500 bg-rose-500/5",
    success: "border-l-emerald-500 bg-emerald-500/5",
  };
  return (
    <div className={cn("border-2 border-l-[6px] border-ink p-3 text-sm", tones[tone])}>
      {title && <p className="font-bold">{title}</p>}
      {children && <div className="text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Switch({ name, defaultChecked, label, description }: { name: string; defaultChecked?: boolean; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-sm text-muted-foreground">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="h-6 w-11 border-2 border-ink bg-muted transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring" />
        <span className="absolute left-1 top-1 h-4 w-4 border-2 border-ink bg-white transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
