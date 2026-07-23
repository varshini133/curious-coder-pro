import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Plus, Clock, TrendingUp, Trash2, X, ArrowRight, BookOpen, Trophy } from "lucide-react";
import { deletePath, generatePath, listPaths } from "@/lib/learning.functions";
import heroBooks from "@/assets/hero-books.png";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Pathwise" }] }),
  component: Dashboard,
});

type PathRow = Awaited<ReturnType<typeof listPaths>>[number];

function Dashboard() {
  const { data: paths, isLoading } = useQuery({
    queryKey: ["paths"],
    queryFn: () => listPaths(),
  });
  const [creating, setCreating] = useState(false);

  const totalHours = (paths ?? []).reduce((sum, p) => sum + (p.estimated_hours ?? 0), 0);
  const totalDone = (paths ?? []).reduce((s, p) => s + (p.progress?.done ?? 0), 0);
  const totalModules = (paths ?? []).reduce((s, p) => s + (p.progress?.total ?? 0), 0);
  const overallPct = totalModules ? Math.round((totalDone / totalModules) * 100) : 0;

  return (
    <div className="space-y-6 pb-24">
      {/* Header hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-6 text-white shadow-glow sm:p-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="text-sm opacity-80">Keep it up!</p>
            <h1 className="mt-1 truncate text-2xl font-extrabold sm:text-3xl">Your learning journey</h1>
            <p className="mt-2 max-w-md text-sm opacity-90">
              {paths?.length
                ? `${totalDone} of ${totalModules} units completed across ${paths.length} path${paths.length === 1 ? "" : "s"}.`
                : "Create your first AI-generated learning path to get started."}
            </p>
            <button
              onClick={() => setCreating(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/30"
            >
              <Plus className="h-4 w-4" /> New learning path
            </button>
          </div>
          <img src={heroBooks} alt="" width={160} height={160} className="hidden shrink-0 animate-float sm:block" />
        </div>
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Learning paths" value={paths?.length ?? 0} tone="blue" />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Overall progress" value={`${overallPct}%`} tone="coral" />
        <StatCard icon={<Trophy className="h-4 w-4" />} label="Units completed" value={totalDone} tone="lavender" />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Est. hours" value={totalHours} tone="blue" />
      </div>

      {/* Paths grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Your paths</h2>
          <button onClick={() => setCreating(true)} className="text-sm font-semibold text-primary hover:underline">
            + New path
          </button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-3xl bg-card" />
            ))}
          </div>
        ) : paths && paths.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paths.map((p) => <PathCard key={p.id} path={p} />)}
          </div>
        ) : (
          <EmptyState onCreate={() => setCreating(true)} />
        )}
      </div>

      {creating && <CreatePathDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: "coral" | "lavender" | "blue" }) {
  const gradient = tone === "coral" ? "bg-gradient-coral" : tone === "lavender" ? "bg-gradient-lavender" : "bg-gradient-blue";
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-soft">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${gradient} text-white`}>{icon}</div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PathCard({ path }: { path: PathRow }) {
  const queryClient = useQueryClient();
  const del = useMutation({
    mutationFn: () => deletePath({ data: { id: path.id } }),
    onSuccess: () => {
      toast.success("Path deleted");
      queryClient.invalidateQueries({ queryKey: ["paths"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const pct = path.progress.total ? Math.round((path.progress.done / path.progress.total) * 100) : 0;
  const gradient = path.color === "coral" ? "bg-gradient-coral" : path.color === "lavender" ? "bg-gradient-lavender" : "bg-gradient-blue";
  const shadow = path.color === "coral" ? "shadow-coral-glow" : "shadow-glow";

  return (
    <div className="group relative flex flex-col rounded-3xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${gradient} ${shadow}`}>
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <button
          onClick={() => del.mutate()}
          className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          aria-label="Delete path"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <h3 className="mt-4 line-clamp-2 text-lg font-bold leading-tight">{path.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{path.description}</p>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium capitalize">{path.difficulty}</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {path.estimated_hours}h</span>
        <span>·</span>
        <span>{path.progress.total} units</span>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium">Progress</span>
          <span className="font-bold text-foreground">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className={`h-full ${gradient} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Link
        to="/paths/$pathId"
        params={{ pathId: path.id }}
        className="mt-5 inline-flex items-center justify-between rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
      >
        Continue learning <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center shadow-soft">
      <img src={heroBooks} alt="" width={140} height={140} className="mx-auto animate-float" />
      <h3 className="mt-4 text-xl font-bold">No learning paths yet</h3>
      <p className="mt-2 text-sm text-muted-foreground">Tell Pathwise what you want to learn and we'll build a custom roadmap in seconds.</p>
      <button onClick={onCreate} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-hero px-5 py-2.5 text-sm font-semibold text-white shadow-glow">
        <Plus className="h-4 w-4" /> Create your first path
      </button>
    </div>
  );
}

function CreatePathDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [skill, setSkill] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");

  const create = useMutation({
    mutationFn: () => generatePath({ data: { skill, difficulty } }),
    onSuccess: (res) => {
      toast.success("Path created!");
      queryClient.invalidateQueries({ queryKey: ["paths"] });
      navigate({ to: "/paths/$pathId", params: { pathId: res.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to generate path"),
  });

  const suggestions = ["Public speaking", "Machine learning basics", "Guitar fundamentals", "Financial literacy", "Product design", "Spanish A1"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-glow">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Design a new path</h2>
            <p className="mt-1 text-sm text-muted-foreground">What do you want to learn?</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Skill or topic</span>
            <input
              autoFocus
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="e.g. Learn to draw portraits"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSkill(s)}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Difficulty</span>
            <div className="grid grid-cols-3 gap-2">
              {(["beginner", "intermediate", "advanced"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium capitalize transition ${
                    difficulty === d
                      ? "border-transparent bg-gradient-hero text-white shadow-glow"
                      : "border-border bg-background hover:bg-accent"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </label>
        </div>

        <button
          onClick={() => create.mutate()}
          disabled={!skill.trim() || create.isPending}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-hero px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:scale-[1.01] disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          {create.isPending ? "Designing your path…" : "Generate path"}
        </button>
      </div>
    </div>
  );
}
