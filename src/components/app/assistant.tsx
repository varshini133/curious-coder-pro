import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Send, X, Trash2, GraduationCap, Loader2 } from "lucide-react";
import { clearChat, listChat, sendChat } from "@/lib/chat.functions";
import { useSignedIn } from "@/hooks/use-signed-in";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Explain time complexity with an example",
  "Make me a 7-day revision plan",
  "Quiz me on SQL joins",
  "What should I learn next?",
];

export function AssistantPanel({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery({ queryKey: ["chat"], queryFn: () => listChat() });

  const send = useMutation({
    mutationFn: (content: string) => sendChat({ data: { content } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const wipe = useMutation({
    mutationFn: () => clearChat(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat"] });
      toast.success("Conversation cleared");
    },
  });

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, send.isPending]);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || send.isPending) return;
    setInput("");
    send.mutate(value);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-hero text-white shadow-glow">
            <GraduationCap className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight">AI Learning Assistant</p>
            <p className="text-[11px] text-muted-foreground">Knows your courses & progress</p>
          </div>
        </div>
        <button
          onClick={() => wipe.mutate()}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          aria-label="Clear conversation"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className={cn("min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4", compact ? "" : "sm:px-6")}>
        {isLoading && <p className="text-sm text-muted-foreground">Loading conversation…</p>}
        {!isLoading && (messages ?? []).length === 0 && (
          <div className="space-y-3 py-6 text-center">
            <p className="text-sm font-semibold">Ask me anything about your studies</p>
            <p className="text-xs text-muted-foreground">Doubts, explanations, revision plans or practice questions.</p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {(messages ?? []).map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-soft">
                {m.content}
              </div>
            ) : (
              <div className="prose prose-sm max-w-[92%] dark:prose-invert prose-p:my-2 prose-headings:mt-3 prose-headings:mb-1 prose-pre:bg-secondary prose-pre:text-foreground">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}
        {send.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
          </div>
        )}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="border-t border-border p-3"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Ask your question…"
            className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={send.isPending || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-white shadow-glow transition hover:opacity-90 disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

export function AssistantFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none" onClick={() => setOpen(false)} />
      )}
      <div
        className={cn(
          "fixed bottom-24 right-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-glow transition-all duration-300 lg:bottom-24 lg:right-6",
          open ? "h-[min(600px,70vh)] opacity-100" : "pointer-events-none h-0 translate-y-4 opacity-0",
        )}
      >
        <AssistantPanel compact />
      </div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-hero text-white shadow-glow transition hover:scale-105 lg:bottom-6 lg:right-6"
        aria-label={open ? "Close assistant" : "Open AI assistant"}
      >
        {open ? <X className="h-6 w-6" /> : <GraduationCap className="h-6 w-6" />}
      </button>
    </>
  );
}
