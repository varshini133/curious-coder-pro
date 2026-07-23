import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Circle, Clock, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getPath, toggleModule } from "@/lib/learning.functions";

export const Route = createFileRoute("/_authenticated/paths/$pathId")({
  head: () => ({ meta: [{ title: "Learning path — Pathwise" }] }),
  component: PathDetail,
});

function PathDetail() {
  const { pathId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["path", pathId],
    queryFn: () => getPath({ data: { id: pathId } }),
  });

  const toggle = useMutation({
    mutationFn: (m: { id: string; completed: boolean }) => toggleModule({ data: m }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["path", pathId] });
      queryClient.invalidateQueries({ queryKey: ["paths"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading) return <div className="h-96 animate-pulse rounded-3xl bg-card" />;
  if (!data) return <p>Path not found.</p>;

  const { path, modules } = data;
  const done = modules.filter((m) => m.completed).length;
  const pct = modules.length ? Math.round((done / modules.length) * 100) : 0;
  const gradient = path.color === "coral" ? "bg-gradient-coral" : path.color === "lavender" ? "bg-gradient-lavender" : "bg-gradient-blue";

  return (
    <div className="space-y-6 pb-24">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className={`relative overflow-hidden rounded-3xl ${gradient} p-6 text-white shadow-glow sm:p-8`}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium capitalize backdrop-blur">{path.difficulty}</span>
            <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{path.title}</h1>
            <p className="mt-2 max-w-2xl text-sm opacity-90">{path.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {path.estimated_hours} hrs</span>
              <span>{done}/{modules.length} units</span>
            </div>
          </div>
          <div className="relative grid h-24 w-24 shrink-0 place-items-center">
            <svg className="absolute inset-0" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="8"
                strokeDasharray={`${(pct / 100) * 264} 264`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <span className="text-lg font-extrabold">{pct}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {modules.map((m, i) => (
          <ModuleRow
            key={m.id}
            index={i}
            module={m}
            onToggle={(v) => toggle.mutate({ id: m.id, completed: v })}
          />
        ))}
      </div>
    </div>
  );
}

type ModuleRowProps = {
  index: number;
  module: {
    id: string;
    title: string;
    description: string | null;
    completed: boolean;
    resources: unknown;
  };
  onToggle: (v: boolean) => void;
};

function ModuleRow({ index, module, onToggle }: ModuleRowProps) {
  const resources = Array.isArray(module.resources) ? (module.resources as { type?: string; title: string; url: string }[]) : [];
  return (
    <div className={`rounded-3xl border border-border bg-card p-5 shadow-soft transition ${module.completed ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-4">
        <button
          onClick={() => onToggle(!module.completed)}
          className="mt-1 shrink-0"
          aria-label={module.completed ? "Mark incomplete" : "Mark complete"}
        >
          {module.completed
            ? <CheckCircle2 className="h-6 w-6 text-primary" />
            : <Circle className="h-6 w-6 text-muted-foreground transition hover:text-primary" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">Unit {index + 1}</span>
            <h3 className={`text-base font-bold ${module.completed ? "line-through" : ""}`}>{module.title}</h3>
          </div>
          {module.description && <p className="mt-2 text-sm text-muted-foreground">{module.description}</p>}

          {resources.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {resources.map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm transition hover:border-primary hover:bg-accent"
                >
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-lavender text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span className="line-clamp-1 flex-1 font-medium">{r.title}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
