import { createFileRoute } from "@tanstack/react-router";
import { AssistantPanel } from "@/components/app/assistant";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [
    { title: "AI Learning Assistant — Pathwise" },
    { name: "description", content: "Ask doubts, get explanations and build revision plans with your AI learning assistant." },
    { property: "og:title", content: "AI Learning Assistant — Pathwise" },
    { property: "og:description", content: "Ask doubts and get personalised study help." },
  ] }),
  component: () => (
    <div className="pb-28">
      <div className="flex h-[calc(100vh-11rem)] min-h-[520px] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <AssistantPanel />
      </div>
    </div>
  ),
});
