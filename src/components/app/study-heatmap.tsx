import { useMemo } from "react";

/** GitHub-style study heatmap for the last ~17 weeks. */
export function StudyHeatmap({ data }: { data: { day: string; minutes: number }[] }) {
  const weeks = useMemo(() => {
    const map = new Map(data.map((d) => [d.day, d.minutes]));
    const days: { key: string; minutes: number; date: Date }[] = [];
    const total = 17 * 7;
    for (let i = total - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000);
      const key = date.toISOString().slice(0, 10);
      days.push({ key, minutes: map.get(key) ?? 0, date });
    }
    const cols: typeof days[] = [];
    for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));
    return cols;
  }, [data]);

  const level = (m: number) => (m === 0 ? 0 : m < 30 ? 1 : m < 60 ? 2 : m < 90 ? 3 : 4);
  const bg = [
    "bg-muted",
    "bg-[oklch(0.86_0.07_265)]",
    "bg-[oklch(0.76_0.13_265)]",
    "bg-[oklch(0.66_0.19_265)]",
    "bg-[oklch(0.55_0.23_265)]",
  ];

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((d) => (
              <div
                key={d.key}
                title={`${d.key} — ${d.minutes} min`}
                className={`h-3.5 w-3.5 rounded-[4px] transition-transform hover:scale-125 ${bg[level(d.minutes)]}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Less</span>
        {bg.map((b, i) => (
          <span key={i} className={`h-3 w-3 rounded-[4px] ${b}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
