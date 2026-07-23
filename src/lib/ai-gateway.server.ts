// Server-only helper for calling Lovable AI Gateway
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callLovableAI(opts: {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  responseFormat?: "text" | "json_object";
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  const body: Record<string, unknown> = {
    model: opts.model ?? "google/gemini-2.5-flash",
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI rate limit reached, please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in your workspace to continue.");
    throw new Error(`AI request failed [${res.status}]: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("AI returned no content");
  return content;
}
