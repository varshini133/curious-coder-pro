import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Bookmark, FileText, Video, Link2, BookOpen, Database, Presentation, Quote } from "lucide-react";
import { listResources, recordResourceView, toggleBookmark } from "@/lib/student.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [
    { title: "Resource Library — Pathwise Smart Education" },
    { name: "description", content: "PDFs, videos, notes, datasets and references curated by instructors." },
    { property: "og:title", content: "Resource Library — Pathwise" },
    { property: "og:description", content: "Curated study resources by type and topic." },
  ] }),
  component: LibraryPage,
});

const ICONS: Record<string, typeof FileText> = { pdf: FileText, video: Video, link: Link2, notes: BookOpen, doc: FileText, dataset: Database, slides: Presentation, bibtex: Quote };

function LibraryPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["resources"], queryFn: () => listResources() });
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");

  const mark = useMutation({ mutationFn: (id: string) => recordResourceView({ data: { resourceId: id } }) });
  const bm = useMutation({
    mutationFn: (v: { id: string; on: boolean }) => toggleBookmark({ data: { resourceId: v.id, bookmarked: v.on } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resources"] }),
  });

  const types = ["all", ...Array.from(new Set((data ?? []).map((r) => r.type)))];
  const filtered = (data ?? []).filter((r) => (type === "all" || r.type === type) && r.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6 pb-28">
      <header className="rounded-3xl bg-gradient-coral p-6 text-white shadow-coral-glow">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Resource library</h1>
        <p className="mt-2 max-w-xl text-sm opacity-90">Instructor-curated PDFs, videos, notes, datasets, slides and BibTeX references.</p>
      </header>

      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft sm:flex-row">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} placeholder="Search resources…" className="w-full bg-transparent py-2.5 text-sm outline-none" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {types.map((t) => (
            <button key={t} onClick={() => setType(t)} className={cn("shrink-0 rounded-xl px-3 py-2 text-xs font-semibold uppercase transition", type === t ? "bg-gradient-hero text-white shadow-glow" : "bg-secondary hover:bg-accent")}>{t}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0,1,2,3,4,5].map((i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-card" />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const Icon = ICONS[r.type] ?? Link2;
            return (
              <article key={r.id} className="flex flex-col rounded-3xl border border-border bg-card p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-blue text-white shadow-soft"><Icon className="h-4 w-4" /></span>
                  <button onClick={() => bm.mutate({ id: r.id, on: !r.bookmarked })} aria-label="Bookmark" className={cn("rounded-lg p-2 transition", r.bookmarked ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                    <Bookmark className={cn("h-4 w-4", r.bookmarked && "fill-current")} />
                  </button>
                </div>
                <h3 className="mt-3 text-sm font-bold">{r.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{r.category} · {r.type} · {r.reading_minutes} min</p>
                <a href={r.url} target="_blank" rel="noreferrer noopener" onClick={() => mark.mutate(r.id)} className="mt-4 rounded-xl bg-gradient-hero px-3 py-2.5 text-center text-sm font-semibold text-white shadow-glow transition hover:opacity-90">Open resource</a>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
