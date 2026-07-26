import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, BookOpen, Library, TrendingUp } from "lucide-react";
import { BarChart, Bar as RBar, ResponsiveContainer, Tooltip, XAxis, CartesianGrid } from "recharts";
import { getInstructorOverview } from "@/lib/instructor.functions";
import { StatCard, SectionCard, Bar } from "@/components/app/stat-card";

export const Route = createFileRoute("/_authenticated/instructor")({
  head: () => ({ meta: [
    { title: "Instructor Dashboard — Pathwise Smart Education" },
    { name: "description", content: "Monitor student engagement, path coverage and resource activity across departments." },
    { property: "og:title", content: "Instructor Dashboard — Pathwise" },
    { property: "og:description", content: "Student analytics and course insights." },
  ] }),
  component: InstructorPage,
});

function InstructorPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["instructor"], queryFn: () => getInstructorOverview() });
  if (error) return <p className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{(error as Error).message}</p>;
  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-3xl bg-card" />;
  const s = data.stats;

  return (
    <div className="space-y-6 pb-28">
      <header className="rounded-3xl bg-gradient-hero p-6 text-white shadow-glow">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Instructor overview</h1>
        <p className="mt-2 text-sm opacity-90">{s.students} students · {s.courses} paths · avg progress {s.avgProgress}%</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Students" value={s.students} tone="blue" hint={`${s.atRisk} at risk`} />
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Paths" value={s.courses} tone="coral" />
        <StatCard icon={<Library className="h-4 w-4" />} label="Resources" value={s.resources} tone="lavender" />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Avg progress" value={`${s.avgProgress}%`} tone="mint" hint={`${s.totalHours}h studied`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Engagement mix">
          <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.engagement}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)", fontSize: 12 }} />
            <RBar dataKey="value" radius={[8, 8, 0, 0]} fill="oklch(0.58 0.22 265)" />
          </BarChart></ResponsiveContainer></div>
        </SectionCard>
        <SectionCard title="Departments">
          <div className="space-y-3">
            {data.departments.map((d) => (
              <div key={d.label}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{d.label}</span><span className="text-muted-foreground">{d.students} students · {d.avg}%</span></div>
                <Bar pct={d.avg} tone="lavender" />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Paths & content coverage">
        <div className="grid gap-3 sm:grid-cols-2">
          {data.courses.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-background p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c.category}</p>
              <h3 className="text-sm font-bold">{c.title}</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">{c.moduleCount} units · {c.resourceCount} resources · {c.instructor_name}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
