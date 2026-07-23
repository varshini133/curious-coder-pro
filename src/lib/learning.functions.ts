import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAYS = ["Compass", "BookOpen", "Rocket", "Brain", "Palette", "Code", "Music", "Dumbbell", "Camera", "Globe"] as const;
const COLORS = ["coral", "lavender", "blue"] as const;

export const listPaths = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: paths, error } = await context.supabase
      .from("learning_paths")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: modules } = await context.supabase
      .from("path_modules")
      .select("path_id, completed");
    const stats: Record<string, { total: number; done: number }> = {};
    for (const m of modules ?? []) {
      const s = stats[m.path_id] ?? (stats[m.path_id] = { total: 0, done: 0 });
      s.total++;
      if (m.completed) s.done++;
    }
    return (paths ?? []).map((p) => ({ ...p, progress: stats[p.id] ?? { total: 0, done: 0 } }));
  });

export const getPath = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: path, error } = await context.supabase
      .from("learning_paths")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!path) throw new Error("Path not found");
    const { data: modules } = await context.supabase
      .from("path_modules")
      .select("*")
      .eq("path_id", data.id)
      .order("position");
    return { path, modules: modules ?? [] };
  });

const GenerateInput = z.object({
  skill: z.string().min(2).max(120),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
});

export const generatePath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => GenerateInput.parse(v))
  .handler(async ({ data, context }) => {
    const { callLovableAI } = await import("./ai-gateway.server");
    const prompt = `You are an expert curriculum designer. Create a focused learning path for the skill: "${data.skill}" at ${data.difficulty} level.

Return STRICT JSON with this shape (no prose):
{
  "title": "short catchy title (max 60 chars)",
  "description": "1-2 sentence overview",
  "estimated_hours": <integer between 5 and 80>,
  "modules": [
    {
      "title": "Unit N - short title",
      "description": "1-2 sentences on what the learner will achieve",
      "resources": [
        { "type": "article" | "video" | "book" | "practice", "title": "resource name", "url": "https://..." }
      ]
    }
  ]
}
Include between 5 and 8 modules. Include 2-4 resources per module with realistic URLs (YouTube, well-known docs sites, Wikipedia, freeCodeCamp, MDN, Khan Academy, etc). Output JSON only.`;

    const content = await callLovableAI({
      messages: [
        { role: "system", content: "You return valid JSON only. Never wrap in code fences." },
        { role: "user", content: prompt },
      ],
      responseFormat: "json_object",
      temperature: 0.7,
    });

    let parsed: {
      title: string; description: string; estimated_hours: number;
      modules: { title: string; description: string; resources: { type: string; title: string; url: string }[] }[];
    };
    try {
      parsed = JSON.parse(content.replace(/^```(?:json)?/, "").replace(/```$/, "").trim());
    } catch {
      throw new Error("AI returned malformed data. Try again.");
    }
    if (!Array.isArray(parsed.modules) || parsed.modules.length === 0) {
      throw new Error("AI returned no modules. Try again.");
    }

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const icon = GATEWAYS[Math.floor(Math.random() * GATEWAYS.length)];

    const { data: path, error: pathErr } = await context.supabase
      .from("learning_paths")
      .insert({
        user_id: context.userId,
        title: parsed.title.slice(0, 100),
        skill: data.skill,
        description: parsed.description,
        difficulty: data.difficulty,
        estimated_hours: parsed.estimated_hours ?? 20,
        color,
        icon,
      })
      .select()
      .single();
    if (pathErr || !path) throw new Error(pathErr?.message ?? "Failed to save path");

    const rows = parsed.modules.slice(0, 12).map((m, i) => ({
      path_id: path.id,
      user_id: context.userId,
      title: m.title.slice(0, 200),
      description: m.description ?? "",
      resources: (m.resources ?? []).slice(0, 6),
      position: i,
    }));
    const { error: modErr } = await context.supabase.from("path_modules").insert(rows);
    if (modErr) throw new Error(modErr.message);

    return { id: path.id };
  });

export const toggleModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid(), completed: z.boolean() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("path_modules")
      .update({ completed: data.completed, completed_at: data.completed ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("learning_paths").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
