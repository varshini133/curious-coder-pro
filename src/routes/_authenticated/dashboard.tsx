import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Flame,
  Clock,
  Trophy,
  ArrowRight,
  CheckCircle2,
  Circle,
  CalendarDays,
  Bell,
  Plus,
  Award,
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar as RBar, ResponsiveContainer, Tooltip, XAxis, CartesianGrid } from "recharts";
import { bootstrapStudent, getStudentOverview, toggleTask, addTask } from "@/lib/student.functions";
import { getAccount } from "@/lib/account.functions";
import { ProgressRing } from "@/components/app/progress-ring";
import { StatCard, SectionCard, Bar } from "@/components/app/stat-card";
import { StudyHeatmap } from "@/components/app/study-heatmap";
import heroBooks from "@/assets/hero-books.png";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — Pathwise Smart Education" },
      { name: "description", content: "Track course progress, streaks, upcoming deadlines and study analytics in one place." },
      { property: "og:title", content: "Student Dashboard — Pathwise" },
      { property: "og:description", content: "Track course progress, streaks and study analytics." },
    ],
  }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const qc = useQueryClient();
  const boot = useQuery({ queryKey: ["bootstrap"], queryFn: () => bootstrapStudent(), staleTime: Infinity });
  const { data: account } = useQuery({ queryKey: ["account"], queryFn: () => getAccount() });
  const { data, isLoading } = useQuery({
    queryKey: ["overview"],
    queryFn: () => getStudentOverview(),
    enabled: boot.isSuccess,
  });

  const [newTask, setNewTask] = useState("");
  const flip = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => toggleTask({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["overview"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const create = useMutation({
    mutationFn: (title: string) =>
      addTask({ data: { title, due_at: new Date(Date.now() + 3 * 86400000).toISOString() } }),
    onSuccess: () => {
      setNewTask("");
      toast.success("Task added");
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4 pb-24">
        <div className="h-44 animate-pulse rounded-3xl bg-card" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      </div>
    );
  }

  const s = data.stats;
  const firstName = (account?.profile?.display_name ?? "there").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6 pb-28">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-6 text-white shadow-glow sm:p-8">
        <div className="relative z-10 grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-sm opacity-80">{greeting}, {firstName} 👋</p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">You're {s.overallPct}% through your paths</h1>
            <p className="mt-2 max-w-lg text-sm opacity-90">
              {s.doneModules} of {s.totalModules} units completed · {s.hours}h studied · {s.streak}-day streak
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.current && (
                <Link
                  to="/courses/$courseId"
                  params={{ courseId: data.current.id }}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/30"
                >
                  Continue learning <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
              >
                <Plus className="h-4 w-4" /> Browse catalogue
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-3xl bg-white/15 p-3 backdrop-blur">
              <ProgressRing value={s.overallPct} size={104} tone="coral" sublabel="overall" />
            </div>
            <img src={heroBooks} alt="" width={140} height={140} className="hidden animate-float xl:block" />
          </div>
        </div>
        <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Active paths" value={s.activePaths} tone="blue" hint={`${s.skillsCompleted} completed`} />
        <StatCard icon={<Flame className="h-4 w-4" />} label="Current streak" value={`${s.streak} days`} tone="coral" hint="Keep it alive!" />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Hours studied" value={s.hours} tone="lavender" hint={`${s.readingMinutes} minutes total`} />
        <StatCard icon={<Trophy className="h-4 w-4" />} label="Certificates" value={s.certificates} tone="mint" hint="Verified & downloadable" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Continue learning + paths */}
        <div className="space-y-6 lg:col-span-2">
          {data.current && (
            <SectionCard
              title="Continue learning"
              action={
                <Link to="/courses" className="text-xs font-semibold text-primary hover:underline">
                  All paths
                </Link>
              }
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <ProgressRing value={data.current.pct} size={88} tone="primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{data.current.category}</p>
                  <h3 className="truncate text-lg font-bold">{data.current.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Next up: {data.current.nextModule?.title ?? "All units complete 🎉"}
                  </p>
                  <div className="mt-3">
                    <Bar pct={data.current.pct} />
                  </div>
                </div>
                <Link
                  to="/courses/$courseId"
                  params={{ courseId: data.current.id }}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-hero px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
                >
                  Resume <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </SectionCard>
          )}

          <SectionCard title="In progress">
            <div className="grid gap-3 sm:grid-cols-2">
              {data.courses.map((c) => (
                <Link
                  key={c.id}
                  to="/courses/$courseId"
                  params={{ courseId: c.id }}
                  className="group rounded-2xl border border-border bg-background p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c.category}</p>
                      <h4 className="truncate text-sm font-bold">{c.title}</h4>
                    </div>
                    <span className="shrink-0 rounded-lg bg-secondary px-2 py-1 text-[11px] font-bold">{c.pct}%</span>
                  </div>
                  <div className="mt-3">
                    <Bar pct={c.pct} tone={c.color} />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {c.done}/{c.total} units · {c.estimated_hours}h · {c.difficulty}
                  </p>
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Weekly study time">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.weekly}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.58 0.22 265)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.58 0.22 265)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${v} min`, "Studied"]}
                  />
                  <Area type="monotone" dataKey="minutes" stroke="oklch(0.58 0.22 265)" strokeWidth={3} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Study consistency">
            <StudyHeatmap data={data.heatmap} />
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <SectionCard
            title="Upcoming deadlines"
            action={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="space-y-2">
              {data.tasks.slice(0, 6).map((t) => (
                <button
                  key={t.id}
                  onClick={() => flip.mutate({ id: t.id, done: !t.done })}
                  className="flex w-full items-start gap-3 rounded-xl border border-border bg-background p-3 text-left transition hover:bg-accent"
                >
                  {t.done ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0">
                    <span className={`block text-sm font-medium ${t.done ? "line-through opacity-60" : ""}`}>{t.title}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {t.course_title ? `${t.course_title} · ` : ""}
                      {t.due_at ? new Date(t.due_at).toLocaleDateString("en", { day: "numeric", month: "short" }) : "No date"}
                    </span>
                  </span>
                </button>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newTask.trim().length > 1) create.mutate(newTask.trim());
                }}
                className="flex gap-2 pt-1"
              >
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  maxLength={140}
                  placeholder="Add a task…"
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button className="rounded-xl bg-gradient-hero px-3 text-white shadow-glow" aria-label="Add task">
                  <Plus className="h-4 w-4" />
                </button>
              </form>
            </div>
          </SectionCard>

          <SectionCard title="Monthly hours">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)", fontSize: 12 }}
                    formatter={(v) => [`${v} h`, "Studied"]}
                  />
                  <RBar dataKey="hours" radius={[8, 8, 0, 0]} fill="oklch(0.72 0.18 25)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Notifications"
            action={
              <Link to="/notifications" className="text-xs font-semibold text-primary hover:underline">
                View all
              </Link>
            }
          >
            <div className="space-y-2">
              {data.notifications.slice(0, 4).map((n) => (
                <div key={n.id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                  <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="line-clamp-2 text-[11px] text-muted-foreground">{n.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Achievements"
            action={
              <Link to="/certificates" className="text-xs font-semibold text-primary hover:underline">
                Certificates
              </Link>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "First steps", unlocked: s.doneModules > 0, tone: "bg-gradient-blue" },
                { label: "Week warrior", unlocked: s.streak >= 7, tone: "bg-gradient-coral" },
                { label: "10 units", unlocked: s.doneModules >= 10, tone: "bg-gradient-lavender" },
                { label: "Certified", unlocked: s.certificates > 0, tone: "bg-gradient-hero" },
              ].map((b) => (
                <div
                  key={b.label}
                  className={`rounded-2xl p-3 text-center text-white shadow-soft transition ${b.unlocked ? b.tone : "bg-muted text-muted-foreground"}`}
                >
                  <Award className="mx-auto h-5 w-5" />
                  <p className="mt-1 text-[11px] font-bold">{b.label}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
