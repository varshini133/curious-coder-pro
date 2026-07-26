import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Circle, Clock, FileText, Video, Link2, BookOpen } from "lucide-react";
import { enroll, getCourse, setModuleComplete } from "@/lib/student.functions";
import { ProgressRing } from "@/components/app/progress-ring";
import { SectionCard } from "@/components/app/stat-card";

export const Route = createFileRoute("/_authenticated/courses/$courseId")({
  head: () => ({
    meta: [
      { title: "Path detail — Pathwise Smart Education" },
      { name: "description", content: "Work through units, mark progress and open attached resources for this learning path." },
      { property: "og:title", content: "Path detail — Pathwise" },
      { property: "og:description", content: "Work through units and track progress." },
    ],
  }),
  component: CourseDetail,
});

const ICONS: Record<string, typeof FileText> = { pdf: FileText, video: Video, link: Link2, notes: BookOpen };

function CourseDetail() {
  const { courseId } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["course", courseId], queryFn: () => getCourse({ data: { id: courseId } }) });

  const toggle = useMutation({
    mutationFn: (v: { moduleId: string; completed: boolean; minutes: number }) =>
      setModuleComplete({ data: { moduleId: v.moduleId, courseId, completed: v.completed, minutes: v.minutes } }),
    onSuccess: (res) => {
      if (res.certificate) toast.success("Path complete — certificate issued! 🎉");
      qc.invalidateQueries({ queryKey: ["course", courseId] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const join = useMutation({
    mutationFn: () => enroll({ data: { courseId } }),
    onSuccess: () => {
      toast.success("Enrolled");
      qc.invalidateQueries({ queryKey: ["course", courseId] });
    },
  });

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-3xl bg-card" />;

  const done = data.modules.filter((m) => m.completed).length;
  const pct = data.modules.length ? Math.round((done / data.modules.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-28">
      <Link to="/courses" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All paths
      </Link>

      <header className="flex flex-col gap-5 rounded-3xl bg-gradient-hero p-6 text-white shadow-glow sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80">{data.course.category}</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{data.course.title}</h1>
          <p className="mt-2 max-w-xl text-sm opacity-90">{data.course.description}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium opacity-90">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {data.course.estimated_hours}h</span>
            <span className="capitalize">{data.course.difficulty}</span>
            <span>{data.course.instructor_name}</span>
          </div>
          {!data.enrolled && (
            <button onClick={() => join.mutate()} className="mt-4 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/30">
              Enrol in this path
            </button>
          )}
        </div>
        <div className="rounded-3xl bg-white/15 p-3 backdrop-blur">
          <ProgressRing value={pct} size={104} tone="coral" sublabel={`${done}/${data.modules.length} units`} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Units" className="lg:col-span-2">
          <ol className="space-y-3">
            {data.modules.map((m, i) => (
              <li key={m.id} className="flex gap-3 rounded-2xl border border-border bg-background p-4 transition hover:shadow-soft">
                <button
                  onClick={() => toggle.mutate({ moduleId: m.id, completed: !m.completed, minutes: m.reading_minutes })}
                  aria-label={m.completed ? "Mark incomplete" : "Mark complete"}
                  className="mt-0.5 shrink-0"
                >
                  {m.completed ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Unit {i + 1} · {m.reading_minutes} min</p>
                  <h3 className={`text-sm font-bold ${m.completed ? "line-through opacity-60" : ""}`}>{m.title}</h3>
                  {m.description && <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { url: m.video_url, label: "Video" },
                      { url: m.pdf_url, label: "PDF" },
                      { url: m.doc_url, label: "Notes" },
                      { url: m.external_url, label: "Reference" },
                    ]
                      .filter((l) => l.url)
                      .map((l) => (
                        <a
                          key={l.label}
                          href={l.url as string}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-semibold hover:bg-accent"
                        >
                          {l.label}
                        </a>
                      ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>

        <SectionCard title="Attached resources">
          <div className="space-y-2">
            {data.resources.length === 0 && <p className="text-sm text-muted-foreground">No resources attached yet.</p>}
            {data.resources.map((r) => {
              const Icon = ICONS[r.type] ?? Link2;
              return (
                <a
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-start gap-3 rounded-xl border border-border bg-background p-3 transition hover:bg-accent"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{r.title}</span>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{r.type} · {r.reading_minutes} min</span>
                  </span>
                </a>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
