import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Download } from "lucide-react";
import { listCertificates } from "@/lib/student.functions";
import { getAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/certificates")({
  head: () => ({ meta: [
    { title: "Certificates — Pathwise Smart Education" },
    { name: "description", content: "View and download the certificates you have earned for completed learning paths." },
    { property: "og:title", content: "Certificates — Pathwise" },
    { property: "og:description", content: "Download certificates for completed paths." },
  ] }),
  component: CertificatesPage,
});

function CertificatesPage() {
  const { data } = useQuery({ queryKey: ["certificates"], queryFn: () => listCertificates() });
  const { data: account } = useQuery({ queryKey: ["account"], queryFn: () => getAccount() });
  const name = account?.profile?.display_name ?? "Student";

  return (
    <div className="space-y-6 pb-28">
      <header className="rounded-3xl bg-gradient-lavender p-6 text-white shadow-glow">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Certificates</h1>
        <p className="mt-2 text-sm opacity-90">Complete every unit in a path to unlock a verifiable certificate.</p>
      </header>

      {(data ?? []).length === 0 && (
        <p className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No certificates yet — finish a learning path to earn your first one.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {(data ?? []).map((c) => (
          <article key={c.id} className="overflow-hidden rounded-3xl border-2 border-primary/30 bg-card p-6 shadow-soft transition hover:shadow-glow">
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-hero text-white shadow-glow"><Award className="h-5 w-5" /></span>
              <span className="rounded-lg bg-secondary px-2 py-1 text-[11px] font-bold uppercase tracking-wide">Grade {c.grade}</span>
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Certificate of completion</p>
            <h2 className="mt-1 text-lg font-extrabold">{c.course_title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Awarded to <span className="font-semibold text-foreground">{name}</span></p>
            <p className="mt-1 text-[11px] text-muted-foreground">Serial {c.serial} · Issued {new Date(c.issued_at).toLocaleDateString()}</p>
            <button onClick={() => window.print()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-hero px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90">
              <Download className="h-4 w-4" /> Download / print
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
