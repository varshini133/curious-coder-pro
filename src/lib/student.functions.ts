import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();

/* ------------------------------------------------------------------ */
/* Bootstrap: gives a brand-new student a realistic demo dataset      */
/* ------------------------------------------------------------------ */

export const bootstrapStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .limit(1);
    if (existing && existing.length > 0) return { seeded: false };

    const { data: courses } = await supabase
      .from("courses")
      .select("id, title, slug")
      .in("slug", ["web-development", "python-programming", "dsa", "dbms", "git-github"]);
    if (!courses || courses.length === 0) return { seeded: false };

    await supabase.from("enrollments").insert(
      courses.map((c, i) => ({
        user_id: userId,
        course_id: c.id,
        assigned_by: i % 2 === 0 ? "Dr. Anita Verma" : "Prof. Rajeev Menon",
      })),
    );

    // Complete a varying number of modules per course
    const completeCounts: Record<string, number> = {
      "git-github": 6,
      "web-development": 4,
      "python-programming": 3,
      dsa: 2,
      dbms: 1,
    };
    for (const c of courses) {
      const { data: modules } = await supabase
        .from("course_modules")
        .select("id")
        .eq("course_id", c.id)
        .order("position");
      const take = completeCounts[c.slug ?? ""] ?? 2;
      const rows = (modules ?? []).slice(0, take).map((m, i) => ({
        user_id: userId,
        module_id: m.id,
        course_id: c.id,
        completed: true,
        completed_at: new Date(Date.now() - (take - i) * 86400000 * 2).toISOString(),
      }));
      if (rows.length) await supabase.from("module_progress").insert(rows);
    }

    // 120 days of learning activity (deterministic pseudo-random)
    const activity: { user_id: string; day: string; minutes: number }[] = [];
    for (let d = 119; d >= 0; d--) {
      const date = new Date(Date.now() - d * 86400000);
      const seed = (d * 7919) % 100;
      const weekend = date.getDay() === 0 || date.getDay() === 6;
      let minutes = seed < 22 ? 0 : 20 + (seed % 75);
      if (weekend && seed % 3 === 0) minutes = 0;
      if (d < 6) minutes = 35 + (seed % 60); // keep the current streak alive
      if (minutes > 0)
        activity.push({
          user_id: userId,
          day: date.toISOString().slice(0, 10),
          minutes,
        });
    }
    await supabase.from("learning_activity").insert(activity);

    const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
    await supabase.from("tasks").insert([
      { user_id: userId, title: "Submit DBMS normalisation assignment", course_title: "Database Management Systems", due_at: day(1) },
      { user_id: userId, title: "Complete Unit 5 — Advanced Topics", course_title: "Full-Stack Web Development", due_at: day(2) },
      { user_id: userId, title: "DSA weekly problem set (10 problems)", course_title: "Data Structures & Algorithms", due_at: day(4) },
      { user_id: userId, title: "Watch recorded lecture: Python OOP", course_title: "Python Programming Mastery", due_at: day(6) },
      { user_id: userId, title: "Prepare capstone project proposal", course_title: "Full-Stack Web Development", due_at: day(9) },
      { user_id: userId, title: "Git branching lab", course_title: "Git & GitHub for Teams", due_at: day(-2), done: true },
    ]);

    await supabase.from("notifications").insert([
      { user_id: userId, type: "reminder", title: "Assignment due tomorrow", body: "DBMS normalisation assignment closes in 24 hours." },
      { user_id: userId, type: "resource", title: "New resource added", body: "3 new Machine Learning notebooks are now in the Resource Library." },
      { user_id: userId, type: "update", title: "Course updated", body: "Full-Stack Web Development — Unit 5 has refreshed reading material." },
      { user_id: userId, type: "progress", title: "You're on a 6-day streak", body: "Keep going to unlock the Fortnight Focus badge." },
      { user_id: userId, type: "announcement", title: "Dr. Anita Verma posted an announcement", body: "Mid-semester review scheduled for Friday, 11:00, Lab 3." },
      { user_id: userId, type: "progress", title: "Certificate earned", body: "You completed Git & GitHub for Teams. Download your certificate.", read: true },
    ]);

    const git = courses.find((c) => c.slug === "git-github");
    if (git) {
      await supabase.from("certificates").insert({
        user_id: userId,
        course_id: git.id,
        course_title: git.title,
        serial: `PW-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 899999)}`,
        grade: "A",
      });
    }

    return { seeded: true };
  });

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

type CourseRow = {
  id: string;
  title: string;
  slug: string | null;
  category: string;
  description: string | null;
  difficulty: string;
  estimated_hours: number;
  icon: string | null;
  color: string;
  instructor_name: string | null;
};

function streakFrom(days: string[]) {
  const set = new Set(days);
  let streak = 0;
  for (let d = 0; d < 400; d++) {
    const key = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
    if (set.has(key)) streak++;
    else if (d > 0) break;
  }
  return streak;
}

export const getStudentOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [
      { data: enrollments },
      { data: progress },
      { data: activity },
      { data: tasks },
      { data: notifications },
      { data: certificates },
      { data: views },
    ] = await Promise.all([
      supabase.from("enrollments").select("course_id, courses(*)").eq("user_id", userId),
      supabase.from("module_progress").select("module_id, course_id, completed, completed_at").eq("user_id", userId),
      supabase.from("learning_activity").select("day, minutes").eq("user_id", userId).order("day"),
      supabase.from("tasks").select("*").eq("user_id", userId).order("due_at"),
      supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      supabase.from("certificates").select("*").eq("user_id", userId).order("issued_at", { ascending: false }),
      supabase
        .from("resource_views")
        .select("viewed_at, resources(id, title, type, category, url)")
        .eq("user_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(6),
    ]);

    const courseIds = (enrollments ?? []).map((e) => e.course_id);
    const { data: modules } = courseIds.length
      ? await supabase.from("course_modules").select("id, course_id, title, position, reading_minutes").in("course_id", courseIds)
      : { data: [] as { id: string; course_id: string; title: string; position: number; reading_minutes: number }[] };

    const doneIds = new Set((progress ?? []).filter((p) => p.completed).map((p) => p.module_id));

    const courses = (enrollments ?? [])
      .map((e) => {
        const course = e.courses as unknown as CourseRow | null;
        if (!course) return null;
        const mods = (modules ?? []).filter((m) => m.course_id === course.id).sort((a, b) => a.position - b.position);
        const done = mods.filter((m) => doneIds.has(m.id)).length;
        const next = mods.find((m) => !doneIds.has(m.id)) ?? null;
        return {
          ...course,
          total: mods.length,
          done,
          pct: mods.length ? Math.round((done / mods.length) * 100) : 0,
          nextModule: next ? { id: next.id, title: next.title } : null,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    const totalModules = courses.reduce((s, c) => s + c.total, 0);
    const doneModules = courses.reduce((s, c) => s + c.done, 0);
    const totalMinutes = (activity ?? []).reduce((s, a) => s + a.minutes, 0);

    const weekly = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.now() - (6 - i) * 86400000);
      const key = date.toISOString().slice(0, 10);
      const found = (activity ?? []).find((a) => a.day === key);
      return {
        label: date.toLocaleDateString("en", { weekday: "short" }),
        minutes: found?.minutes ?? 0,
      };
    });

    const monthly = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i), 1);
      const prefix = date.toISOString().slice(0, 7);
      const minutes = (activity ?? [])
        .filter((a) => a.day.startsWith(prefix))
        .reduce((s, a) => s + a.minutes, 0);
      return { label: date.toLocaleDateString("en", { month: "short" }), hours: Math.round(minutes / 60) };
    });

    const inProgress = courses
      .filter((c) => c.pct > 0 && c.pct < 100)
      .sort((a, b) => b.pct - a.pct);

    return {
      courses,
      current: inProgress[0] ?? courses[0] ?? null,
      stats: {
        totalModules,
        doneModules,
        overallPct: totalModules ? Math.round((doneModules / totalModules) * 100) : 0,
        readingMinutes: totalMinutes,
        hours: Math.round(totalMinutes / 60),
        streak: streakFrom((activity ?? []).map((a) => a.day)),
        skillsCompleted: courses.filter((c) => c.pct === 100).length,
        certificates: (certificates ?? []).length,
        activePaths: courses.length,
      },
      weekly,
      monthly,
      heatmap: (activity ?? []).map((a) => ({ day: a.day, minutes: a.minutes })),
      tasks: tasks ?? [],
      notifications: notifications ?? [],
      certificates: certificates ?? [],
      recentResources: (views ?? []).map((v) => ({
        viewed_at: v.viewed_at,
        resource: v.resources as unknown as { id: string; title: string; type: string; category: string; url: string } | null,
      })),
    };
  });

/* ------------------------------------------------------------------ */
/* Courses                                                             */
/* ------------------------------------------------------------------ */

export const listCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: courses }, { data: enrollments }, { data: progress }, { data: modules }] = await Promise.all([
      supabase.from("courses").select("*").eq("is_published", true).order("created_at"),
      supabase.from("enrollments").select("course_id").eq("user_id", userId),
      supabase.from("module_progress").select("module_id, course_id, completed").eq("user_id", userId),
      supabase.from("course_modules").select("id, course_id"),
    ]);
    const enrolled = new Set((enrollments ?? []).map((e) => e.course_id));
    const done = new Set((progress ?? []).filter((p) => p.completed).map((p) => p.module_id));
    return (courses ?? []).map((c) => {
      const mods = (modules ?? []).filter((m) => m.course_id === c.id);
      const doneCount = mods.filter((m) => done.has(m.id)).length;
      return {
        ...c,
        enrolled: enrolled.has(c.id),
        total: mods.length,
        done: doneCount,
        pct: mods.length ? Math.round((doneCount / mods.length) * 100) : 0,
      };
    });
  });

export const getCourse = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: uuid }).parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: course, error } = await supabase.from("courses").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!course) throw new Error("Course not found");
    const [{ data: modules }, { data: progress }, { data: enrollment }, { data: resources }] = await Promise.all([
      supabase.from("course_modules").select("*").eq("course_id", data.id).order("position"),
      supabase.from("module_progress").select("module_id, completed, completed_at").eq("user_id", userId).eq("course_id", data.id),
      supabase.from("enrollments").select("id").eq("user_id", userId).eq("course_id", data.id).maybeSingle(),
      supabase.from("resources").select("*").eq("course_id", data.id),
    ]);
    const doneMap = new Map((progress ?? []).map((p) => [p.module_id, p]));
    return {
      course,
      enrolled: !!enrollment,
      resources: resources ?? [],
      modules: (modules ?? []).map((m) => ({
        ...m,
        completed: doneMap.get(m.id)?.completed ?? false,
        completed_at: doneMap.get(m.id)?.completed_at ?? null,
      })),
    };
  });

export const enroll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ courseId: uuid }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("enrollments")
      .upsert(
        { user_id: context.userId, course_id: data.courseId, assigned_by: "Self-enrolled" },
        { onConflict: "user_id,course_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setModuleComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ moduleId: uuid, courseId: uuid, completed: z.boolean(), minutes: z.number().int().min(0).max(600).optional() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("module_progress").upsert(
      {
        user_id: userId,
        module_id: data.moduleId,
        course_id: data.courseId,
        completed: data.completed,
        completed_at: data.completed ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,module_id" },
    );
    if (error) throw new Error(error.message);

    if (data.completed && data.minutes) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: row } = await supabase
        .from("learning_activity")
        .select("minutes")
        .eq("user_id", userId)
        .eq("day", today)
        .maybeSingle();
      await supabase
        .from("learning_activity")
        .upsert({ user_id: userId, day: today, minutes: (row?.minutes ?? 0) + data.minutes }, { onConflict: "user_id,day" });
    }

    // Award a certificate when the whole course is finished
    const [{ data: modules }, { data: progress }] = await Promise.all([
      supabase.from("course_modules").select("id").eq("course_id", data.courseId),
      supabase.from("module_progress").select("module_id, completed").eq("user_id", userId).eq("course_id", data.courseId),
    ]);
    const total = (modules ?? []).length;
    const done = (progress ?? []).filter((p) => p.completed).length;
    let certificate = false;
    if (total > 0 && done === total) {
      const { data: existing } = await supabase
        .from("certificates")
        .select("id")
        .eq("user_id", userId)
        .eq("course_id", data.courseId)
        .maybeSingle();
      if (!existing) {
        const { data: course } = await supabase.from("courses").select("title").eq("id", data.courseId).maybeSingle();
        await supabase.from("certificates").insert({
          user_id: userId,
          course_id: data.courseId,
          course_title: course?.title ?? "Course",
          serial: `PW-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 899999)}`,
          grade: "A",
        });
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "progress",
          title: "Certificate earned",
          body: `You completed ${course?.title ?? "a course"}. Download your certificate.`,
        });
        certificate = true;
      }
    }
    return { ok: true, certificate };
  });

/* ------------------------------------------------------------------ */
/* Resource library                                                    */
/* ------------------------------------------------------------------ */

export const listResources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: resources }, { data: bookmarks }, { data: views }] = await Promise.all([
      supabase.from("resources").select("*").order("created_at", { ascending: false }),
      supabase.from("bookmarks").select("resource_id, is_favourite").eq("user_id", userId),
      supabase.from("resource_views").select("resource_id, viewed_at").eq("user_id", userId).order("viewed_at", { ascending: false }),
    ]);
    const bm = new Map((bookmarks ?? []).map((b) => [b.resource_id, b]));
    const vw = new Map((views ?? []).map((v) => [v.resource_id, v.viewed_at]));
    return (resources ?? []).map((r) => ({
      ...r,
      bookmarked: bm.has(r.id),
      favourite: bm.get(r.id)?.is_favourite ?? false,
      viewed_at: vw.get(r.id) ?? null,
    }));
  });

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ resourceId: uuid, bookmarked: z.boolean(), favourite: z.boolean().optional() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.bookmarked) {
      await supabase.from("bookmarks").delete().eq("user_id", userId).eq("resource_id", data.resourceId);
      return { ok: true };
    }
    const { error } = await supabase.from("bookmarks").upsert(
      { user_id: userId, resource_id: data.resourceId, is_favourite: data.favourite ?? false },
      { onConflict: "user_id,resource_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordResourceView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ resourceId: uuid }).parse(v))
  .handler(async ({ data, context }) => {
    await context.supabase.from("resource_views").upsert(
      { user_id: context.userId, resource_id: data.resourceId, viewed_at: new Date().toISOString() },
      { onConflict: "user_id,resource_id" },
    );
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Notifications / tasks                                               */
/* ------------------------------------------------------------------ */

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: notifications }, { data: announcements }] = await Promise.all([
      context.supabase
        .from("notifications")
        .select("*")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false }),
      context.supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(10),
    ]);
    return { notifications: notifications ?? [], announcements: announcements ?? [] };
  });

export const markNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: uuid.optional(), all: z.boolean().optional() }).parse(v))
  .handler(async ({ data, context }) => {
    const q = context.supabase.from("notifications").update({ read: true }).eq("user_id", context.userId);
    const { error } = data.all ? await q : await q.eq("id", data.id ?? "");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: uuid, done: z.boolean() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tasks")
      .update({ done: data.done })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ title: z.string().trim().min(2).max(140), due_at: z.string().min(4) }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tasks")
      .insert({ user_id: context.userId, title: data.title, due_at: new Date(data.due_at).toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCertificates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("certificates")
      .select("*")
      .eq("user_id", context.userId)
      .order("issued_at", { ascending: false });
    return data ?? [];
  });
