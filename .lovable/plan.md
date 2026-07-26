Smart Education platform ("Pathwise") — full build in one pass, keeping the existing soft-white / coral-lavender-blue design language, plus dark mode.

## 1. Roles & auth

- `app_role` enum (`student`, `instructor`) in a separate `user_roles` table + `has_role()` security-definer function (never on `profiles`).
- Sign-up screen gets a Student / Instructor segmented toggle; the chosen role is written to `user_roles` on signup.
- Auth screens: Login, Sign Up, Forgot Password (+ `/reset-password` page), Remember Me, Google sign-in, inline field validation messages.
- After login, role decides the landing page: `/dashboard` (student) or `/instructor` (instructor). Sidebar items are role-filtered.

## 2. Database (Lovable Cloud)

New/extended tables, all with RLS + grants:

```text
profiles          + role-agnostic fields: department, bio, skills[], avatar
user_roles        student | instructor
learning_paths    + instructor_id, category, is_published, thumbnail
path_modules      + reading_minutes, difficulty, video_url, external_url
resources         title, type (pdf|docx|video|pptx|xlsx|link|bibtex),
                  url, category, difficulty, size, instructor_id, path_id
enrollments       student_id, path_id, assigned_by, progress
module_progress   student_id, module_id, completed, completed_at
bookmarks         student_id, resource_id, is_favourite
resource_views    student_id, resource_id, viewed_at   (recently viewed)
certificates      student_id, path_id, serial, issued_at
notifications     user_id, type, title, body, read
announcements     instructor_id, title, body, path_id
tasks             student_id, title, due_at, done      (upcoming tasks/calendar)
quizzes/quiz_attempts
user_settings     theme, language, notification + privacy prefs
chat_messages     (exists) — AI assistant history
learning_activity student_id, day, minutes   (streak, heatmap, charts)
```

Storage bucket `resources` (private) with owner/enrolled read policies for instructor uploads.

Seed migration: Computer Science & Software Engineering — 10 paths (Web Development, Python, DSA, DBMS, AI, ML, UI/UX, Cloud, Cyber Security, Git & GitHub), 5 instructors, 20 students, ~50 resources, modules, enrollments, progress, activity history, quizzes, certificates, notifications, announcements.

## 3. Student pages

- **Dashboard** — welcome + profile card, overall progress ring, Continue Learning, current path, recently opened resources, upcoming tasks, learning calendar, notifications bell/panel, weekly progress bar chart, monthly analytics, streak, achievement badges, reading time, skills completed, global search, quick actions.
- **Learning Paths** → list + interactive vertical timeline detail. Each module: title, description, PDF/Word/video/link resources, reading time, difficulty pill, completion status, Mark as Complete, Download.
- **Resource Library** — search, category + difficulty filters, resource cards, in-app PDF viewer (iframe), video player, doc viewer (Office online / download), bookmark, favourite, download, recently viewed rail.
- **Progress** — circular indicator, weekly chart, monthly report, reading stats, total hours, completed/remaining modules, skills progress bars, GitHub-style heatmap, certificates earned. Charts via Recharts.
- **Certificates** — completed courses, preview modal, download (client-rendered certificate → PNG/PDF), achievement history.
- **Notifications**, **Profile** (picture upload, name, email, department, skills, stats, certificates, edit), **Settings** (dark/light, language, notification + privacy + account, change password, logout).

## 4. Instructor pages

- Dashboard: total students, active paths, resources uploaded, student analytics charts, performance reports, recent activity, announcements composer.
- Upload Resource (multi-type file upload to storage + link/BibTeX entry, assign to path).
- Create Learning Path (manual builder + optional AI draft), Assign paths to students, Student progress monitoring table with drill-down.

## 5. AI Learning Assistant

Floating chat button on every authenticated page + full `/assistant` page. ChatGPT-style streaming UI built with AI Elements over Lovable AI, persistent history in `chat_messages`, system prompt aware of the student's paths/modules/resources so it can recommend materials, explain concepts, and suggest the next module.

## Technical notes

- All data access through `createServerFn` with `requireSupabaseAuth`; instructor-only mutations verify role via `has_role`.
- Role-gated layouts: `_authenticated/` (shared) with an instructor guard on instructor routes; a role mismatch redirects to the correct dashboard.
- Dark mode via a `dark` class on `<html>` with dark token values in `src/styles.css`, persisted in `user_settings` + localStorage (read after hydration to avoid mismatch).
- Charts: `recharts`. Heatmap and progress rings: custom SVG components.
- Each route gets its own `head()` metadata.

This is a large build — expect several sequential steps (migrations first, then routes/UI).
