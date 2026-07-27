import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { claimRole, getAccount } from "@/lib/account.functions";
import heroBooks from "@/assets/hero-books.png";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: "signup" | "signin" } => ({
    mode: s.mode === "signup" ? ("signup" as const) : ("signin" as const),
  }),
  head: () => ({ meta: [{ title: "Sign in — Pathwise" }] }),
  component: AuthPage,
});

const PENDING_ROLE_KEY = "pathwise:pending-role";

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"student" | "instructor">("student");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);


  async function finishSignIn(chosen?: "student" | "instructor") {
    const pending =
      chosen ??
      ((localStorage.getItem(PENDING_ROLE_KEY) as "student" | "instructor" | null) ?? undefined);
    let resolved: "student" | "instructor" = "student";
    try {
      if (pending) {
        const res = await claimRole({ data: { role: pending } });
        resolved = res.role as "student" | "instructor";
      } else {
        const account = await getAccount();
        resolved = account.role;
      }
    } catch {
      resolved = pending ?? "student";
    }
    localStorage.removeItem(PENDING_ROLE_KEY);
    navigate({ to: resolved === "instructor" ? "/instructor" : "/dashboard" });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void finishSignIn();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function friendlyError(message: string) {
    const m = message.toLowerCase();
    if (m.includes("invalid login credentials"))
      return "Incorrect email or password. Please try again.";
    if (m.includes("email not confirmed"))
      return "This account isn't confirmed yet. Try signing up again or contact support.";
    if (m.includes("user already registered") || m.includes("already been registered"))
      return "An account with this email already exists — try signing in instead.";
    if (m.includes("password should be at least"))
      return "Password must be at least 6 characters.";
    if (m.includes("pwned") || m.includes("compromised") || m.includes("weak"))
      return "That password has appeared in a data breach. Please choose a stronger one.";
    if (m.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
    return message;
  }

  function validate() {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setFormError("Please enter a valid email address.");
      return null;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return null;
    }
    setFormError(null);
    return trimmed;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validEmail = validate();
    if (!validEmail) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: validEmail, password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { full_name: name || validEmail.split("@")[0] },
          },
        });
        if (error) throw error;
        // Auto-confirm is on, but fall back to an explicit sign-in if no session came back.
        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: validEmail,
            password,
          });
          if (signInError) throw signInError;
        }
        toast.success("Account created! Signing you in…");
        await finishSignIn(role);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: validEmail,
          password,
        });
        if (error) throw error;
        if (!data.session) throw new Error("Invalid login credentials");
        toast.success("Signed in successfully");
        await finishSignIn();
      }
    } catch (err) {
      const message = friendlyError(err instanceof Error ? err.message : "Something went wrong");
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }


  async function onGoogle() {
    setLoading(true);
    if (mode === "signup") localStorage.setItem(PENDING_ROLE_KEY, role);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    await finishSignIn();
  }


  return (
    <div className="min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-2">
        <div className="hidden flex-col justify-between p-10 lg:flex">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-hero shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">Pathwise</span>
          </Link>
          <div className="relative">
            <div className="rounded-3xl bg-gradient-hero p-8 text-white shadow-glow">
              <p className="text-sm/relaxed opacity-90">"I asked for a plan to learn public speaking and had a full 6-week roadmap in seconds. The AI tutor is like having a coach."</p>
              <p className="mt-4 text-sm font-semibold">— Alex, product designer</p>
            </div>
            <img src={heroBooks} alt="" width={280} height={280} className="pointer-events-none absolute -right-4 -top-16 animate-float" />
          </div>
          <p className="text-xs text-muted-foreground">Any skill. A clear path. A tutor in your pocket.</p>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-soft">
            <Link to="/" className="mb-6 flex items-center gap-2 lg:hidden">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-hero"><Sparkles className="h-4 w-4 text-white" /></div>
              <span className="font-bold">Pathwise</span>
            </Link>
            <h1 className="text-2xl font-bold">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signup" ? "Start building your learning paths." : "Sign in to continue your journey."}
            </p>

            {mode === "signup" && (
              <div className="mt-6">
                <span className="mb-2 block text-xs font-semibold text-muted-foreground">I am a…</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["student", "instructor"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      aria-pressed={role === r}
                      className={
                        "rounded-xl border px-3 py-3 text-sm font-semibold capitalize transition " +
                        (role === r
                          ? "border-transparent bg-gradient-hero text-white shadow-glow"
                          : "border-border bg-background text-foreground/70 shadow-soft hover:bg-accent")
                      }
                    >
                      {r === "student" ? "🎓 Student" : "🧑‍🏫 Instructor"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onGoogle}
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium shadow-soft transition hover:bg-accent disabled:opacity-60"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              or
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              {mode === "signup" && (
                <Field label="Name" value={name} onChange={setName} placeholder="Your name" />
              )}
              <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
              <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
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
                {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signup" ? "Already have an account?" : "New to Pathwise?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="font-semibold text-primary hover:underline"
              >
                {mode === "signup" ? "Sign in" : "Create an account"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none ring-ring/40 transition focus:border-ring focus:ring-2"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.2 2.8-2.5 3.7v3h4c2.4-2.2 3.5-5.4 3.5-8.9z"/>
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-4-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.3v3.1C3.3 21.3 7.3 24 12 24z"/>
      <path fill="#FBBC05" d="M5.4 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4l4.1-3.1z"/>
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5C18 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.6l4.1 3.1C6.3 6.9 8.9 4.8 12 4.8z"/>
    </svg>
  );
}
