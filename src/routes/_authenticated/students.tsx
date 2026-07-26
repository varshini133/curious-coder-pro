import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { getInstructorOverview } from "@/lib/instructor.functions";
import { SectionCard, Bar } from "@/components/app/stat-card";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({ meta: [
    { title: "Students — Pathwise Smart Education" },
    { name: "description", content: "Monitor individual student progress, streaks and activity for your cohort." },
    { property: "og:title", content: "Students — Pathwise" },
    { property: "og:description", content: "Cohort progress monitoring." },
  ] }),
  component: StudentsPage,
});

function StudentsPage() {
  const { data, error } = useQuery({ queryKey: ["instructor"], queryFn: () => getInstructorOverview() });
  const [q, setQ] = useState("");
  if (error) return <p className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{(error as Error).message}</p>;
  if (!data) return <div className="h-64 animate-pulse rounded-3xl bg-card" />;
  const rows = data.students.filter((p) => p.full_name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6 pb-28">
      <header className="rounded-3xl bg-gradient-blue p-6 text-white shadow-glow">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Student monitoring</h1>
        <p className="mt-2 text-sm opacity-90">{data.students.length} enrolled learners across departments.</p>
      </header>

      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 shadow-soft">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} placeholder="Search students…" className="w-full bg-transparent py-3 text-sm outline-none" />
      </div>

      <SectionCard title="Cohort">
        <div className="space-y-2">
          {rows.map((p) => (
            <div key={p.id} className="grid gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{p.full_name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{p.email} · {p.department}</p>
              </div>
              <div><Bar pct={p.progress} tone={p.progress < 25 ? "coral" : "blue"} /><p className="mt-1 text-[11px] text-muted-foreground">{p.progress}% · {p.enrolled_paths} paths</p></div>
              <p className="text-[11px] text-muted-foreground sm:text-right">{p.hours}h · {p.streak}d streak<br />Active {new Date(p.last_active).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
