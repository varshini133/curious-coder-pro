import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Megaphone } from "lucide-react";
import { listNotifications, markNotifications } from "@/lib/student.functions";
import { SectionCard } from "@/components/app/stat-card";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [
    { title: "Notifications — Pathwise Smart Education" },
    { name: "description", content: "Deadline reminders, new resources, course updates and instructor announcements." },
    { property: "og:title", content: "Notifications — Pathwise" },
    { property: "og:description", content: "Reminders, updates and announcements." },
  ] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["notifications"], queryFn: () => listNotifications() });
  const read = useMutation({
    mutationFn: (v: { id?: string; all?: boolean }) => markNotifications({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["unread"] }); },
  });

  return (
    <div className="space-y-6 pb-28">
      <header className="flex items-center justify-between gap-4 rounded-3xl bg-gradient-blue p-6 text-white shadow-glow">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Notifications</h1>
          <p className="mt-2 text-sm opacity-90">Reminders, resource drops and announcements.</p>
        </div>
        <button onClick={() => read.mutate({ all: true })} className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-3 py-2 text-xs font-semibold backdrop-blur hover:bg-white/30">
          <CheckCheck className="h-4 w-4" /> Mark all read
        </button>
      </header>

      <SectionCard title="Your alerts">
        <div className="space-y-2">
          {(data?.notifications ?? []).map((n) => (
            <button key={n.id} onClick={() => read.mutate({ id: n.id })} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition hover:bg-accent ${n.read ? "border-border bg-background" : "border-primary/40 bg-primary/5"}`}>
              <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{n.title}</span>
                <span className="block text-xs text-muted-foreground">{n.body}</span>
                <span className="text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
              </span>
            </button>
          ))}
          {(data?.notifications ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
        </div>
      </SectionCard>

      <SectionCard title="Announcements">
        <div className="space-y-2">
          {(data?.announcements ?? []).map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
              <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{a.author_name}{a.course_title ? ` · ${a.course_title}` : ""}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
