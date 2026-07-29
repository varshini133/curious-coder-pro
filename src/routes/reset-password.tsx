import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Pathwise" },
      { name: "description", content: "Choose a new password for your Pathwise account and get back to learning." },
      { property: "og:title", content: "Set a new password — Pathwise" },
      { property: "og:description", content: "Choose a new password for your Pathwise account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("new password should be different"))
    return "Your new password must be different from the old one.";
  if (m.includes("password should be at least")) return "Password must be at least 6 characters.";
  if (m.includes("pwned") || m.includes("compromised") || m.includes("weak"))
    return "That password has appeared in a data breach. Please choose a stronger one.";
  if (m.includes("expired") || m.includes("invalid")) return "This reset link is invalid or has expired.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  return message;
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let done = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        done = true;
        setStatus("ready");
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        done = true;
        setStatus("ready");
      }
    });
    const timer = setTimeout(() => {
      if (!done) setStatus("invalid");
    }, 2500);
    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords don't match.");
      return;
    }
    setFormError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're all set!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const message = friendlyError(err instanceof Error ? err.message : "Something went wrong");
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-soft">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-hero">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold">Pathwise</span>
        </Link>

        {status === "checking" && (
          <p className="text-sm text-muted-foreground">Checking your reset link…</p>
        )}

        {status === "invalid" && (
          <>
            <h1 className="text-2xl font-bold">Link expired</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This password reset link is invalid or has expired. Request a new one to continue.
            </p>
            <Link
              to="/auth"
              search={{ mode: "signin" as const }}
              className="mt-6 block w-full rounded-xl bg-gradient-hero px-4 py-2.5 text-center text-sm font-semibold text-white shadow-glow transition hover:scale-[1.01]"
            >
              Back to sign in
            </Link>
          </>
        )}

        {status === "ready" && (
          <>
            <h1 className="text-2xl font-bold">Set a new password</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose a password you haven't used before.</p>
            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">New password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none ring-ring/40 transition focus:border-ring focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Confirm password</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none ring-ring/40 transition focus:border-ring focus:ring-2"
                />
              </label>
              {formError && (
                <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                  {formError}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-gradient-hero px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:scale-[1.01] disabled:opacity-60"
              >
                {loading ? "Please wait…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
