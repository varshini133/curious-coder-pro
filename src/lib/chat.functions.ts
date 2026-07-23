import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listChat = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const sendChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ content: z.string().min(1).max(4000) }).parse(v))
  .handler(async ({ data, context }) => {
    const { callLovableAI } = await import("./ai-gateway.server");

    // Save user message
    const { error: e1 } = await context.supabase
      .from("chat_messages")
      .insert({ user_id: context.userId, role: "user", content: data.content });
    if (e1) throw new Error(e1.message);

    // Load recent history
    const { data: history } = await context.supabase
      .from("chat_messages")
      .select("role, content")
      .order("created_at", { ascending: true })
      .limit(40);

    const messages = [
      {
        role: "system" as const,
        content:
          "You are Pathwise Tutor, a friendly, patient, and encouraging AI learning tutor. Explain concepts clearly, use analogies, offer small exercises, and always end responses with a short follow-up question or suggestion. Format with markdown when helpful.",
      },
      ...(history ?? []).map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    const reply = await callLovableAI({ messages, temperature: 0.7 });

    const { error: e2 } = await context.supabase
      .from("chat_messages")
      .insert({ user_id: context.userId, role: "assistant", content: reply });
    if (e2) throw new Error(e2.message);

    return { reply };
  });

export const clearChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
