import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RoleSchema = z.enum(["student", "instructor"]);

/** Returns the caller's role, profile and settings. Creates defaults on first call. */
export const getAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims as { email?: string }).email ?? "";

    const [{ data: roles }, { data: profile }, { data: settings }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    let role: "student" | "instructor" = roles?.some((r) => r.role === "instructor")
      ? "instructor"
      : "student";

    if (!roles || roles.length === 0) {
      await supabase.from("user_roles").insert({ user_id: userId, role: "student" });
      role = "student";
    }

    let mySettings = settings;
    if (!mySettings) {
      const { data } = await supabase
        .from("user_settings")
        .insert({ user_id: userId })
        .select()
        .single();
      mySettings = data;
    }

    return {
      userId,
      email,
      role,
      profile: profile ?? null,
      settings: mySettings ?? null,
    };
  });

/** Called right after sign-up to store the chosen role. */
export const claimRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ role: RoleSchema }).parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (existing && existing.length > 0) {
      return { role: existing.some((r) => r.role === "instructor") ? "instructor" : "student" };
    }
    await supabase.from("user_roles").insert({ user_id: userId, role: data.role });
    return { role: data.role };
  });

/** Switches the caller's own role between student and instructor. */
export const setRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ role: RoleSchema }).parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) throw new Error(delErr.message);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: data.role });
    if (error) throw new Error(error.message);
    return { role: data.role };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        display_name: z.string().trim().min(1).max(80),
        department: z.string().trim().max(80).optional(),
        bio: z.string().trim().max(500).optional(),
        skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
        avatar_url: z.string().trim().url().max(500).optional().or(z.literal("")),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        display_name: data.display_name,
        department: data.department ?? null,
        bio: data.bio ?? null,
        skills: data.skills ?? [],
        avatar_url: data.avatar_url ? data.avatar_url : null,
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        theme: z.enum(["light", "dark"]).optional(),
        language: z.string().max(20).optional(),
        email_notifications: z.boolean().optional(),
        push_notifications: z.boolean().optional(),
        reminder_notifications: z.boolean().optional(),
        profile_public: z.boolean().optional(),
        show_progress: z.boolean().optional(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_settings")
      .upsert({ user_id: context.userId, ...data, updated_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
