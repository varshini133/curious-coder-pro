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

    // Build learner context so the assistant can give personalised answers
    const [{ data: enrollments }, { data: progress }, { data: profile }] = await Promise.all([
      context.supabase.from("enrollments").select("courses(title, category, difficulty)").eq("user_id", context.userId),
      context.supabase.from("module_progress").select("completed").eq("user_id", context.userId),
      context.supabase.from("profiles").select("display_name, department").eq("id", context.userId).maybeSingle(),
    ]);
    const courseList = (enrollments ?? [])
      .map((e) => (e.courses as unknown as { title: string } | null)?.title)
      .filter(Boolean)
      .join(", ");
    const doneCount = (progress ?? []).filter((p) => p.completed).length;

    const messages = [
      {
        role: "system" as const,
        content:
          "You are Pathwise Assistant, a friendly, patient AI learning assistant inside a Smart Education platform. " +
          "Explain concepts clearly with analogies, suggest short exercises, recommend next steps in the learner's courses, " +
          "and help with doubts, revision plans and study schedules. Use markdown. End with a brief follow-up question.\n\n" +
          `Learner context — name: ${profile?.display_name ?? "student"}; department: ${profile?.department ?? "n/a"}; ` +
          `enrolled courses: ${courseList || "none yet"}; units completed: ${doneCount}.`,
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
