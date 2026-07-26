import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  size = 96,
  stroke = 9,
  label,
  sublabel,
  tone = "primary",
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  tone?: "primary" | "coral" | "lavender" | "mint";
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;
  const colors: Record<string, string> = {
    primary: "oklch(0.58 0.22 265)",
    coral: "oklch(0.72 0.18 25)",
    lavender: "oklch(0.68 0.16 300)",
    mint: "oklch(0.72 0.14 165)",
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold leading-none">{label ?? `${pct}%`}</span>
        {sublabel && <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}
