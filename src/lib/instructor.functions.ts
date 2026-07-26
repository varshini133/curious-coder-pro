import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();

type Sb = { rpc: (fn: "has_role", args: { _user_id: string; _role: "instructor" }) => PromiseLike<{ data: unknown }> };

async function assertInstructor(supabase: Sb, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "instructor" });
  if (data !== true) throw new Error("Instructor access required");
}

export const getInstructorOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertInstructor(supabase, userId);

    const [{ data: people }, { data: courses }, { data: resources }, { data: announcements }, { data: modules }] =
      await Promise.all([
        supabase.from("demo_people").select("*").order("progress", { ascending: false }),
        supabase.from("courses").select("*").order("created_at"),
        supabase.from("resources").select("*").order("created_at", { ascending: false }),
        supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(8),
        supabase.from("course_modules").select("id, course_id"),
      ]);

    const students = (people ?? []).filter((p) => p.role === "student");
    const instructors = (people ?? []).filter((p) => p.role === "instructor");

    const avgProgress = students.length
      ? Math.round(students.reduce((s, p) => s + p.progress, 0) / students.length)
      : 0;
    const totalHours = students.reduce((s, p) => s + p.hours, 0);

    const byCategory = Object.entries(
      (courses ?? []).reduce<Record<string, number>>((acc, c) => {
        acc[c.category] = (acc[c.category] ?? 0) + 1;
        return acc;
      }, {}),
    ).map(([label, value]) => ({ label, value }));

    const engagement = ["Excellent", "On track", "Slipping", "At risk"].map((label) => {
      const value = students.filter((p) => {
        if (label === "Excellent") return p.progress >= 75;
        if (label === "On track") return p.progress >= 50 && p.progress < 75;
        if (label === "Slipping") return p.progress >= 25 && p.progress < 50;
        return p.progress < 25;
      }).length;
      return { label, value };
    });

    const departments = Object.entries(
      students.reduce<Record<string, { total: number; sum: number }>>((acc, p) => {
        acc[p.department] = acc[p.department] ?? { total: 0, sum: 0 };
        acc[p.department].total += 1;
        acc[p.department].sum += p.progress;
        return acc;
      }, {}),
    ).map(([label, v]) => ({ label, students: v.total, avg: Math.round(v.sum / v.total) }));

    return {
      students,
      instructors,
      courses: (courses ?? []).map((c) => ({
        ...c,
        moduleCount: (modules ?? []).filter((m) => m.course_id === c.id).length,
        resourceCount: (resources ?? []).filter((r) => r.course_id === c.id).length,
      })),
      resources: resources ?? [],
      announcements: announcements ?? [],
      stats: {
        students: students.length,
        instructors: instructors.length,
        courses: (courses ?? []).length,
        resources: (resources ?? []).length,
        avgProgress,
        totalHours,
        atRisk: students.filter((p) => p.progress < 25).length,
      },
      byCategory,
      engagement,
      departments,
    };
  });

export const createCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        title: z.string().trim().min(3).max(120),
        category: z.string().trim().min(2).max(60),
        description: z.string().trim().max(600).optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]),
        estimated_hours: z.number().int().min(1).max(500),
        color: z.enum(["blue", "coral", "lavender", "mint"]),
        instructor_name: z.string().trim().min(2).max(80),
        modules: z.array(z.string().trim().min(2).max(140)).max(30),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertInstructor(supabase, userId);
    const { data: course, error } = await supabase
      .from("courses")
      .insert({
        title: data.title,
        category: data.category,
        description: data.description ?? null,
        difficulty: data.difficulty,
        estimated_hours: data.estimated_hours,
        color: data.color,
        instructor_name: data.instructor_name,
        created_by: userId,
        is_published: true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (data.modules.length) {
      await supabase.from("course_modules").insert(
        data.modules.map((title, i) => ({
          course_id: course.id,
          title,
          position: i + 1,
          difficulty: data.difficulty,
          reading_minutes: 30,
        })),
      );
    }
    return { id: course.id };
  });

export const addResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        title: z.string().trim().min(3).max(140),
        type: z.enum(["pdf", "video", "doc", "notes", "link", "bibtex", "dataset", "slides"]),
        category: z.string().trim().min(2).max(60),
        url: z.string().trim().url().max(600),
        description: z.string().trim().max(500).optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]),
        reading_minutes: z.number().int().min(1).max(600),
        course_id: uuid.optional(),
        instructor_name: z.string().trim().min(2).max(80),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertInstructor(supabase, userId);
    const { error } = await supabase.from("resources").insert({
      title: data.title,
      type: data.type,
      category: data.category,
      url: data.url,
      description: data.description ?? null,
      difficulty: data.difficulty,
      reading_minutes: data.reading_minutes,
      course_id: data.course_id ?? null,
      instructor_name: data.instructor_name,
      created_by: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const postAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        title: z.string().trim().min(3).max(140),
        body: z.string().trim().min(3).max(1000),
        author_name: z.string().trim().min(2).max(80),
        course_title: z.string().trim().max(120).optional(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertInstructor(supabase, userId);
    const { error } = await supabase.from("announcements").insert({
      title: data.title,
      body: data.body,
      author_name: data.author_name,
      course_title: data.course_title ?? null,
      author_id: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
