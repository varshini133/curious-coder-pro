import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { clearChat, listChat, sendChat } from "@/lib/chat.functions";
import heroIdea from "@/assets/hero-idea.png";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "AI Tutor — Pathwise" }] }),
  component: ChatPage,
});

function ChatPage() {
  const queryClient = useQueryClient();
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["chat"],
    queryFn: () => listChat(),
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = useMutation({
    mutationFn: (content: string) => sendChat({ data: { content } }),
    onMutate: () => setInput(""),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Message failed"),
  });

  const clear = useMutation({
    mutationFn: () => clearChat(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      toast.success("Chat cleared");
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, send.isPending]);

  const suggestions = [
    "Explain neural networks like I'm 12",
    "Give me a 5-minute drill for public speaking",
    "What's a good practice for learning Spanish daily?",
    "Break down compound interest with an example",
  ];

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col rounded-3xl border border-border bg-card shadow-soft">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-lavender shadow-soft">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">AI Tutor</h1>
            <p className="text-xs text-muted-foreground">Ask about any topic — explanations, examples, quick drills.</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => clear.mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <div className="mx-auto max-w-md py-8 text-center">
            <img src={heroIdea} alt="" width={140} height={140} className="mx-auto animate-float" />
            <h2 className="mt-4 text-xl font-bold">What would you like to learn?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Try one of these to get started:</p>
            <div className="mt-5 grid gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send.mutate(s)}
                  className="rounded-xl border border-border bg-background px-4 py-3 text-left text-sm shadow-soft transition hover:border-primary hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => <Bubble key={m.id} role={m.role} content={m.content} />)}
            {send.isPending && <Bubble role="assistant" content="…" thinking />}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (input.trim()) send.mutate(input.trim()); }}
        className="border-t border-border p-3 sm:p-4"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-input bg-background p-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !send.isPending) send.mutate(input.trim());
              }
            }}
            placeholder="Ask your tutor anything…"
            rows={1}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || send.isPending}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-hero text-white shadow-glow transition hover:scale-105 disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function Bubble({ role, content, thinking }: { role: string; content: string; thinking?: boolean }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${isUser ? "bg-foreground text-background" : "bg-gradient-lavender text-white"}`}>
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "bg-gradient-hero text-white shadow-glow" : "border border-border bg-background text-foreground shadow-soft"}`}>
        {thinking ? (
          <span className="inline-flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "0.15s" }} />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "0.3s" }} />
          </span>
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
      </div>
    </div>
  );
}
