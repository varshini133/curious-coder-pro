import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getAccount, updateProfile } from "@/lib/account.functions";
import { SectionCard } from "@/components/app/stat-card";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [
    { title: "My Profile — Pathwise Smart Education" },
    { name: "description", content: "Update your display name, department, bio and skills." },
    { property: "og:title", content: "My Profile — Pathwise" },
    { property: "og:description", content: "Manage your learner profile." },
  ] }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { data: account } = useQuery({ queryKey: ["account"], queryFn: () => getAccount() });
  const [form, setForm] = useState({ display_name: "", department: "", bio: "", skills: "" });

  useEffect(() => {
    if (account?.profile) {
      setForm({
        display_name: account.profile.display_name ?? "",
        department: account.profile.department ?? "",
        bio: account.profile.bio ?? "",
        skills: (account.profile.skills ?? []).join(", "),
      });
    }
  }, [account?.profile]);

  const save = useMutation({
    mutationFn: () =>
      updateProfile({
        data: {
          display_name: form.display_name.trim(),
          department: form.department.trim(),
          bio: form.bio.trim(),
          skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20),
        },
      }),
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["account"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const field = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6 pb-28">
      <header className="rounded-3xl bg-gradient-hero p-6 text-white shadow-glow">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{form.display_name || "Your profile"}</h1>
        <p className="mt-2 text-sm opacity-90">{account?.email} · {account?.role === "instructor" ? "Instructor" : "Student"}</p>
      </header>

      <SectionCard title="Account role">
        <p className="text-sm text-muted-foreground">
          Switch between the student experience and the instructor dashboard.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-sm">
          {(["student", "instructor"] as const).map((r) => (
            <button
              key={r}
              type="button"
              disabled={switchRole.isPending}
              onClick={() => { if (account?.role !== r) switchRole.mutate(r); }}
              aria-pressed={account?.role === r}
              className={
                "rounded-xl border px-3 py-3 text-sm font-semibold capitalize transition disabled:opacity-60 " +
                (account?.role === r
                  ? "border-transparent bg-gradient-hero text-white shadow-glow"
                  : "border-border bg-background text-foreground/70 shadow-soft hover:bg-accent")
              }
            >
              {r === "student" ? "🎓 Student" : "🧑‍🏫 Instructor"}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Personal details">
        <form onSubmit={(e) => { e.preventDefault(); if (form.display_name.trim().length > 0) save.mutate(); }} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Display name
            <input className={field} value={form.display_name} maxLength={80} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required />
          </label>
          <label className="text-sm font-medium">Department
            <input className={field} value={form.department} maxLength={80} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Computer Science" />
          </label>
          <label className="text-sm font-medium sm:col-span-2">Bio
            <textarea className={field} rows={3} maxLength={500} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Final-year CS student focused on full-stack and ML." />
          </label>
          <label className="text-sm font-medium sm:col-span-2">Skills (comma separated)
            <input className={field} value={form.skills} maxLength={300} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, Python, SQL" />
          </label>
          <div className="sm:col-span-2">
            <button disabled={save.isPending} className="rounded-xl bg-gradient-hero px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-60">
              {save.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
