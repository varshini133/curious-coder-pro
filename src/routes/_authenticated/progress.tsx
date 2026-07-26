import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, BarChart, Bar as RBar, RadialBarChart, RadialBar, ResponsiveContainer, Tooltip, XAxis, CartesianGrid } from "recharts";
import { Flame, Clock, Trophy, TrendingUp } from "lucide-react";
import { bootstrapStudent, getStudentOverview } from "@/lib/student.functions";
import { StatCard, SectionCard, Bar } from "@/components/app/stat-card";
import { ProgressRing } from "@/components/app/progress-ring";
import { StudyHeatmap } from "@/components/app/study-heatmap";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [
    { title: "My Progress — Pathwise Smart Education" },
    { name: "description", content: "Analytics for study time, completion rates, streaks and per-path progress." },
    { property: "og:title", content: "My Progress — Pathwise" },
    { property: "og:description", content: "Study analytics, streaks and completion rates." },
  ] }),
  component: ProgressPage,
});

function ProgressPage() {
  const boot = useQuery({ queryKey: ["bootstrap"], queryFn: () => bootstrapStudent(), staleTime: Infinity });
  const { data } = useQuery({ queryKey: ["overview"], queryFn: () => getStudentOverview(), enabled: boot.isSuccess });
  if (!data) return <div className="h-64 animate-pulse rounded-3xl bg-card" />;
  const s = data.stats;

  return (
    <div className="space-y-6 pb-28">
      <header className="flex flex-col gap-5 rounded-3xl bg-gradient-hero p-6 text-white shadow-glow sm:flex-row sm:items-center">
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold sm:text-3xl">Progress analytics</h1>
          <p className="mt-2 text-sm opacity-90">{s.doneModules} units completed · {s.hours} hours studied · {s.streak}-day streak</p>
        </div>
        <div className="rounded-3xl bg-white/15 p-3 backdrop-blur"><ProgressRing value={s.overallPct} size={108} tone="coral" sublabel="overall" /></div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Completion" value={`${s.overallPct}%`} tone="blue" />
        <StatCard icon={<Flame className="h-4 w-4" />} label="Streak" value={`${s.streak}d`} tone="coral" />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Hours" value={s.hours} tone="lavender" />
        <StatCard icon={<Trophy className="h-4 w-4" />} label="Certificates" value={s.certificates} tone="mint" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Weekly study time">
          <div className="h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.weekly}>
            <defs><linearGradient id="p1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="oklch(0.58 0.22 265)" stopOpacity={0.5} /><stop offset="100%" stopColor="oklch(0.58 0.22 265)" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)", fontSize: 12 }} />
            <Area type="monotone" dataKey="minutes" stroke="oklch(0.58 0.22 265)" strokeWidth={3} fill="url(#p1)" />
          </AreaChart></ResponsiveContainer></div>
        </SectionCard>
        <SectionCard title="Monthly hours">
          <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.monthly}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)", fontSize: 12 }} />
            <RBar dataKey="hours" radius={[8, 8, 0, 0]} fill="oklch(0.68 0.16 300)" />
          </BarChart></ResponsiveContainer></div>
        </SectionCard>
      </div>

      <SectionCard title="Per-path completion">
        <div className="space-y-4">
          {data.courses.map((c) => (
            <div key={c.id}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-semibold">{c.title}</span>
                <span className="text-muted-foreground">{c.done}/{c.total} · {c.pct}%</span>
              </div>
              <Bar pct={c.pct} tone={c.color} />
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Consistency" className="lg:col-span-2"><StudyHeatmap data={data.heatmap} /></SectionCard>
        <SectionCard title="Overall">
          <div className="h-56"><ResponsiveContainer width="100%" height="100%">
            <RadialBarChart data={[{ name: "done", value: s.overallPct, fill: "oklch(0.58 0.22 265)" }]} innerRadius="65%" outerRadius="100%" startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" background cornerRadius={12} />
            </RadialBarChart>
          </ResponsiveContainer></div>
          <p className="text-center text-sm text-muted-foreground">{s.overallPct}% of all enrolled units complete</p>
        </SectionCard>
      </div>
    </div>
  );
}
