import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAccount, updateSettings } from "@/lib/account.functions";
import { SectionCard } from "@/components/app/stat-card";
import { ThemeToggle } from "@/components/app/theme-toggle";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [
    { title: "Settings — Pathwise Smart Education" },
    { name: "description", content: "Control theme, notification preferences and profile privacy." },
    { property: "og:title", content: "Settings — Pathwise" },
    { property: "og:description", content: "Theme, notifications and privacy preferences." },
  ] }),
  component: SettingsPage,
});

const TOGGLES = [
  { key: "email_notifications", label: "Email notifications", hint: "Deadline and resource emails" },
  { key: "push_notifications", label: "Push notifications", hint: "In-app alerts" },
  { key: "reminder_notifications", label: "Study reminders", hint: "Daily nudge to keep your streak" },
  { key: "profile_public", label: "Public profile", hint: "Let instructors see your profile" },
  { key: "show_progress", label: "Share progress", hint: "Show progress in instructor reports" },
] as const;

function SettingsPage() {
  const qc = useQueryClient();
  const { data: account } = useQuery({ queryKey: ["account"], queryFn: () => getAccount() });
  const settings = account?.settings as Record<string, boolean> | null | undefined;

  const save = useMutation({
    mutationFn: (patch: Record<string, boolean>) => updateSettings({ data: patch }),
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["account"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 pb-28">
      <header className="rounded-3xl bg-gradient-lavender p-6 text-white shadow-glow">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Settings</h1>
        <p className="mt-2 text-sm opacity-90">Appearance, notifications and privacy.</p>
      </header>

      <SectionCard title="Appearance" action={<ThemeToggle />}>
        <p className="text-sm text-muted-foreground">Switch between light and dark mode with the toggle.</p>
      </SectionCard>

      <SectionCard title="Preferences">
        <div className="space-y-2">
          {TOGGLES.map((t) => {
            const on = settings?.[t.key] ?? true;
            return (
              <div key={t.key} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-3">
                <div>
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">{t.hint}</p>
                </div>
                <button
                  onClick={() => save.mutate({ [t.key]: !on })}
                  aria-label={t.label}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
