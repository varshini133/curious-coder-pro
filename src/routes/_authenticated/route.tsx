import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, MessageCircle, LogOut, Sparkles, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [name, setName] = useState<string>(user.email ?? "You");

  useEffect(() => {
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.display_name) setName(data.display_name); });
  }, [user.id]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/chat", label: "AI Tutor", icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {/* Sidebar */}
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col rounded-3xl border border-border bg-card p-5 shadow-soft lg:flex">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-hero shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">Pathwise</span>
          </Link>

          <nav className="mt-8 flex flex-col gap-1">
            {nav.map((item) => {
              const active = pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-gradient-hero text-white shadow-glow" : "text-foreground/70 hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl bg-gradient-lavender p-4 text-white shadow-soft">
            <p className="text-xs uppercase tracking-wide opacity-80">Signed in</p>
            <p className="mt-1 truncate text-sm font-semibold">{name}</p>
            <button onClick={signOut} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium backdrop-blur hover:bg-white/30">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          {/* Mobile header */}
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-hero"><Sparkles className="h-4 w-4 text-white" /></div>
              <span className="font-bold">Pathwise</span>
            </Link>
            <button onClick={signOut} className="rounded-lg border border-border bg-card p-2 shadow-soft"><LogOut className="h-4 w-4" /></button>
          </div>

          <Outlet />

          {/* Mobile bottom nav */}
          <nav className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-glow lg:hidden">
            {nav.map((item) => {
              const active = pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${active ? "bg-gradient-hero text-white" : "text-foreground/70"}`}>
                  <Icon className="h-4 w-4" /> {item.label}
                </Link>
              );
            })}
            <Link to="/dashboard" className="ml-1 grid h-9 w-9 place-items-center rounded-xl bg-gradient-coral text-white shadow-coral-glow">
              <Plus className="h-4 w-4" />
            </Link>
          </nav>
        </main>
      </div>
    </div>
  );
}
