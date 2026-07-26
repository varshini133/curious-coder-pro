import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  LogOut,
  GraduationCap,
  Library,
  TrendingUp,
  Award,
  Bell,
  User,
  Settings,
  BookOpen,
  Users,
  Bot,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAccount } from "@/lib/account.functions";
import { AssistantFab } from "@/components/app/assistant";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

const STUDENT_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/courses", label: "Learning paths", icon: BookOpen },
  { to: "/library", label: "Resources", icon: Library },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/certificates", label: "Certificates", icon: Award },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
] as const;

const INSTRUCTOR_NAV = [
  { to: "/instructor", label: "Overview", icon: LayoutDashboard },
  { to: "/courses", label: "Learning paths", icon: BookOpen },
  { to: "/library", label: "Resources", icon: Library },
  { to: "/students", label: "Students", icon: Users },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
] as const;

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: account } = useQuery({ queryKey: ["account"], queryFn: () => getAccount() });
  const role = account?.role ?? "student";
  const nav = role === "instructor" ? INSTRUCTOR_NAV : STUDENT_NAV;
  const name = account?.profile?.display_name ?? user.email ?? "You";
  const initials = name.slice(0, 2).toUpperCase();

  const { data: unread } = useQuery({
    queryKey: ["unread"],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false);
      return count ?? 0;
    },
    refetchInterval: 60000,
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6 sm:px-6">
        {/* Sidebar */}
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col rounded-3xl border border-border bg-card p-5 shadow-soft lg:flex">
          <Link to={role === "instructor" ? "/instructor" : "/dashboard"} className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-hero shadow-glow">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="block text-lg font-bold leading-none tracking-tight">Pathwise</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {role === "instructor" ? "Instructor" : "Student"}
              </span>
            </div>
          </Link>

          <nav className="mt-8 flex flex-col gap-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive(item.to)
                      ? "bg-gradient-hero text-white shadow-glow"
                      : "text-foreground/70 hover:translate-x-0.5 hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <div className="my-2 h-px bg-border" />
            <Link
              to="/profile"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive("/profile") ? "bg-secondary text-foreground" : "text-foreground/70 hover:bg-accent",
              )}
            >
              <User className="h-4 w-4" /> Profile
            </Link>
            <Link
              to="/settings"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive("/settings") ? "bg-secondary text-foreground" : "text-foreground/70 hover:bg-accent",
              )}
            >
              <Settings className="h-4 w-4" /> Settings
            </Link>
          </nav>

          <div className="mt-auto rounded-2xl bg-gradient-lavender p-4 text-white shadow-soft">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/25 text-xs font-bold">{initials}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-[11px] opacity-80">{account?.email}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium backdrop-blur transition hover:bg-white/30"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          {/* Top bar */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link to={role === "instructor" ? "/instructor" : "/dashboard"} className="flex items-center gap-2 lg:hidden">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-hero">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold">Pathwise</span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <Link
                to="/notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-soft transition hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {!!unread && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-coral px-1 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <button
                onClick={signOut}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-soft transition hover:text-foreground lg:hidden"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          <Outlet />

          {/* Mobile bottom nav */}
          <nav className="fixed bottom-4 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1.5 shadow-glow lg:hidden">
            {nav.slice(0, 4).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold",
                    isActive(item.to) ? "bg-gradient-hero text-white" : "text-foreground/70",
                  )}
                >
                  <Icon className="h-4 w-4" /> {item.label.split(" ")[0]}
                </Link>
              );
            })}
            <Link to="/profile" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-coral text-white shadow-coral-glow">
              <User className="h-4 w-4" />
            </Link>
          </nav>
        </main>
      </div>
      <AssistantFab />
    </div>
  );
}
