import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Clock, ArrowRight, GraduationCap, Plus, Check } from "lucide-react";
import { enroll, listCourses } from "@/lib/student.functions";
import { Bar } from "@/components/app/stat-card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/courses")({
  head: () => ({
    meta: [
      { title: "Learning Paths — Pathwise Smart Education" },
      { name: "description", content: "Browse Computer Science learning paths, enrol and track unit-by-unit progress." },
      { property: "og:title", content: "Learning Paths — Pathwise" },
      { property: "og:description", content: "Browse CS learning paths and track your progress." },
    ],
  }),
  component: CoursesPage,
});

const LEVELS = ["all", "beginner", "intermediate", "advanced"] as const;

function CoursesPage() {
  const qc = useQueryClient();
  const { data: courses, isLoading } = useQuery({ queryKey: ["courses"], queryFn: () => listCourses() });
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("all");
  const [category, setCategory] = useState("all");

  const join = useMutation({
    mutationFn: (courseId: string) => enroll({ data: { courseId } }),
    onSuccess: () => {
      toast.success("Enrolled — it's on your dashboard now");
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categories = useMemo(
    () => ["all", ...Array.from(new Set((courses ?? []).map((c) => c.category)))],
    [courses],
  );

  const filtered = (courses ?? []).filter(
    (c) =>
      (level === "all" || c.difficulty === level) &&
      (category === "all" || c.category === category) &&
      (c.title.toLowerCase().includes(q.toLowerCase()) ||
        (c.description ?? "").toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="space-y-6 pb-28">
      <header className="rounded-3xl bg-gradient-lavender p-6 text-white shadow-glow">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Learning paths</h1>
        <p className="mt-2 max-w-xl text-sm opacity-90">
          Structured Computer Science paths with units, resources and instructor guidance. Enrol to start tracking progress.
        </p>
      </header>

      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={80}
            placeholder="Search paths…"
            className="w-full bg-transparent py-2.5 text-sm outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={cn(
                "shrink-0 rounded-xl px-3 py-2 text-xs font-semibold capitalize transition",
                level === l ? "bg-gradient-hero text-white shadow-glow" : "bg-secondary text-secondary-foreground hover:bg-accent",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              category === c ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent",
            )}
          >
            {c === "all" ? "All categories" : c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl bg-card" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <article
              key={c.id}
              className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-glow"
            >
              <div
                className={cn(
                  "relative h-24 p-4 text-white",
                  c.color === "coral" ? "bg-gradient-coral" : c.color === "lavender" ? "bg-gradient-lavender" : "bg-gradient-blue",
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest opacity-85">{c.category}</p>
                <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug">{c.title}</h3>
                <div className="absolute -bottom-8 -right-6 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
                  <span className="rounded-lg bg-secondary px-2 py-1 capitalize">{c.difficulty}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {c.estimated_hours}h
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" /> {c.instructor_name}
                  </span>
                </div>
                {c.enrolled && (
                  <div className="mt-3 space-y-1.5">
                    <Bar pct={c.pct} tone={c.color} />
                    <p className="text-[11px] text-muted-foreground">
                      {c.done}/{c.total} units · {c.pct}% complete
                    </p>
                  </div>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <Link
                    to="/courses/$courseId"
                    params={{ courseId: c.id }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-hero px-3 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
                  >
                    {c.enrolled ? "Open path" : "View path"} <ArrowRight className="h-4 w-4" />
                  </Link>
                  {!c.enrolled && (
                    <button
                      onClick={() => join.mutate(c.id)}
                      disabled={join.isPending}
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold transition hover:bg-accent"
                    >
                      <Plus className="h-4 w-4" /> Enrol
                    </button>
                  )}
                  {c.enrolled && (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-secondary px-3 py-2.5 text-xs font-semibold">
                      <Check className="h-4 w-4" /> Enrolled
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No paths match your filters.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
