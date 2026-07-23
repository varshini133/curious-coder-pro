import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, MessageCircle, Compass, ArrowRight } from "lucide-react";
import heroBooks from "@/assets/hero-books.png";
import heroIdea from "@/assets/hero-idea.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pathwise — Learn any skill with your own AI-generated roadmap" },
      { name: "description", content: "Turn any goal into a step-by-step learning path. Track progress and chat with an AI tutor whenever you're stuck." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-hero shadow-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">Pathwise</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="rounded-xl px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground">Sign in</Link>
          <Link to="/auth" search={{ mode: "signup" }} className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">
            Get started
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-8">
        <section className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-coral" />
              AI-generated learning paths
            </div>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Learn any skill with a{" "}
              <span className="bg-gradient-hero bg-clip-text text-transparent">roadmap made for you.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Tell Pathwise what you want to master. Get a structured plan with modules, resources, and a friendly AI tutor to guide you along the way.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" search={{ mode: "signup" }} className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-hero px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:scale-[1.02]">
                Start learning for free
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link to="/auth" className="rounded-2xl border border-border bg-card px-6 py-3.5 text-sm font-semibold shadow-soft hover:bg-accent">
                I already have an account
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              <Stat label="Skills covered" value="Any" />
              <Stat label="AI tutor" value="24/7" />
              <Stat label="Progress saved" value="✓" />
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-4 top-8 animate-float rounded-3xl bg-card p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-coral shadow-coral-glow">
                  <Compass className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unit 3</p>
                  <p className="text-sm font-semibold">Job interview prep</p>
                </div>
                <span className="ml-2 text-xs font-bold text-coral">25%</span>
              </div>
            </div>
            <img src={heroBooks} alt="" width={520} height={520} className="mx-auto animate-float" />
            <div className="absolute -right-2 bottom-6 rounded-3xl bg-card p-4 shadow-soft" style={{ animation: "float 4s ease-in-out infinite", animationDelay: "-2s" }}>
              <div className="flex items-center gap-3">
                <img src={heroIdea} alt="" width={44} height={44} />
                <div>
                  <p className="text-xs text-muted-foreground">AI Tutor</p>
                  <p className="text-sm font-semibold">Ask anything</p>
                </div>
                <MessageCircle className="ml-2 h-4 w-4 text-primary" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-24 grid gap-6 md:grid-cols-3">
          <Feature
            gradient="bg-gradient-coral"
            title="Generate a path"
            body="Describe your goal — Pathwise breaks it into modules with resources and clear milestones."
          />
          <Feature
            gradient="bg-gradient-lavender"
            title="Track progress"
            body="Check off units, watch your progress ring grow, and pick up right where you left off."
          />
          <Feature
            gradient="bg-gradient-blue"
            title="Chat with a tutor"
            body="Stuck on a concept? Ask your AI tutor for an explanation, example, or next step."
          />
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Feature({ gradient, title, body }: { gradient: string; title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-glow">
      <div className={`mb-4 h-12 w-12 rounded-2xl ${gradient} shadow-soft`} />
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
