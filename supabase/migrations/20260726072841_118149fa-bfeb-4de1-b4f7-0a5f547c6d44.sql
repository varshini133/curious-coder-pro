-- ROLES
CREATE TYPE public.app_role AS ENUM ('student','instructor');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'student',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- PROFILE EXTRAS
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}';

-- COURSES (shared catalog)
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE,
  category text NOT NULL DEFAULT 'General',
  description text,
  difficulty text NOT NULL DEFAULT 'beginner',
  estimated_hours integer NOT NULL DEFAULT 20,
  icon text,
  color text NOT NULL DEFAULT 'blue',
  instructor_name text,
  created_by uuid,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses readable" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "instructors create courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'instructor') AND created_by = auth.uid());
CREATE POLICY "instructors update own courses" ON public.courses FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "instructors delete own courses" ON public.courses FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE TABLE public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  reading_minutes integer NOT NULL DEFAULT 15,
  difficulty text NOT NULL DEFAULT 'beginner',
  pdf_url text,
  doc_url text,
  video_url text,
  external_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_modules TO authenticated;
GRANT ALL ON public.course_modules TO service_role;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modules readable" ON public.course_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "instructors write modules" ON public.course_modules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.created_by = auth.uid()));

-- RESOURCES
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'pdf',
  url text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  difficulty text NOT NULL DEFAULT 'beginner',
  size_kb integer NOT NULL DEFAULT 0,
  reading_minutes integer NOT NULL DEFAULT 10,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  instructor_name text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources readable" ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "instructors create resources" ON public.resources FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'instructor') AND created_by = auth.uid());
CREATE POLICY "instructors update own resources" ON public.resources FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "instructors delete own resources" ON public.resources FOR DELETE TO authenticated USING (created_by = auth.uid());

-- STUDENT-OWNED TABLES
CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assigned_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own enrollments" ON public.enrollments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.module_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_progress TO authenticated;
GRANT ALL ON public.module_progress TO service_role;
ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own module progress" ON public.module_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  is_favourite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookmarks" ON public.bookmarks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.resource_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_views TO authenticated;
GRANT ALL ON public.resource_views TO service_role;
ALTER TABLE public.resource_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own resource views" ON public.resource_views FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  course_title text NOT NULL,
  serial text NOT NULL,
  grade text NOT NULL DEFAULT 'A',
  issued_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own certificates" ON public.certificates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  course_title text,
  due_at timestamptz NOT NULL DEFAULT now(),
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.learning_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT current_date,
  minutes integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_activity TO authenticated;
GRANT ALL ON public.learning_activity TO service_role;
ALTER TABLE public.learning_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity" ON public.learning_activity FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'light',
  language text NOT NULL DEFAULT 'en',
  email_notifications boolean NOT NULL DEFAULT true,
  push_notifications boolean NOT NULL DEFAULT true,
  reminder_notifications boolean NOT NULL DEFAULT true,
  profile_public boolean NOT NULL DEFAULT true,
  show_progress boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.user_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- QUIZZES (shared) + attempts (owned)
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quizzes readable" ON public.quizzes FOR SELECT TO authenticated USING (true);

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attempts" ON public.quiz_attempts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid,
  author_name text NOT NULL DEFAULT 'Faculty',
  title text NOT NULL,
  body text NOT NULL,
  course_title text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements readable" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "instructors post announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'instructor') AND author_id = auth.uid());
CREATE POLICY "instructors manage own announcements" ON public.announcements FOR DELETE TO authenticated USING (author_id = auth.uid());

-- DEMO ROSTER (sample students / instructors for analytics screens)
CREATE TABLE public.demo_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'student',
  department text NOT NULL DEFAULT 'Computer Science',
  enrolled_paths integer NOT NULL DEFAULT 0,
  progress integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  hours integer NOT NULL DEFAULT 0,
  last_active date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.demo_people TO authenticated;
GRANT ALL ON public.demo_people TO service_role;
ALTER TABLE public.demo_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roster readable" ON public.demo_people FOR SELECT TO authenticated USING (true);

CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEED: courses
INSERT INTO public.courses (title, slug, category, description, difficulty, estimated_hours, icon, color, instructor_name) VALUES
('Full-Stack Web Development','web-development','Web','Build modern responsive web apps with HTML, CSS, JavaScript, React and Node.js.','beginner',48,'Code','blue','Dr. Anita Verma'),
('Python Programming Mastery','python-programming','Programming','From syntax and data types to OOP, files and automation scripting in Python.','beginner',36,'Rocket','coral','Prof. Rajeev Menon'),
('Data Structures & Algorithms','dsa','Core CS','Arrays, linked lists, trees, graphs, sorting, searching and complexity analysis.','intermediate',60,'Brain','lavender','Dr. Anita Verma'),
('Database Management Systems','dbms','Core CS','Relational modelling, normalisation, SQL, transactions and indexing.','intermediate',40,'BookOpen','blue','Prof. Sneha Iyer'),
('Artificial Intelligence Foundations','artificial-intelligence','AI','Search, knowledge representation, reasoning and intelligent agents.','intermediate',44,'Sparkles','lavender','Dr. Karan Malhotra'),
('Machine Learning in Practice','machine-learning','AI','Regression, classification, model evaluation and deploying ML models.','advanced',52,'Compass','coral','Dr. Karan Malhotra'),
('UI/UX Design for Engineers','ui-ux-design','Design','Design thinking, wireframing, prototyping and usability testing.','beginner',28,'Palette','coral','Prof. Sneha Iyer'),
('Cloud Computing Essentials','cloud-computing','Cloud','Virtualisation, containers, serverless and deploying to the cloud.','intermediate',38,'Globe','blue','Prof. Rajeev Menon'),
('Cyber Security Fundamentals','cyber-security','Security','Threat models, cryptography, network security and secure coding.','intermediate',42,'Shield','lavender','Dr. Karan Malhotra'),
('Git & GitHub for Teams','git-github','Tooling','Version control, branching strategies, pull requests and CI basics.','beginner',14,'GitBranch','blue','Dr. Anita Verma');

-- SEED: modules (6 per course, generated with realistic titles)
INSERT INTO public.course_modules (course_id, title, description, position, reading_minutes, difficulty, pdf_url, doc_url, video_url, external_url)
SELECT c.id,
       'Unit ' || m.i || ' — ' || m.name,
       'In this unit you will ' || m.blurb || ' as part of ' || c.title || '.',
       m.i - 1,
       15 + (m.i * 7),
       CASE WHEN m.i <= 2 THEN 'beginner' WHEN m.i <= 4 THEN 'intermediate' ELSE 'advanced' END,
       'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
       'https://calibre-ebook.com/downloads/demos/demo.docx',
       'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
       'https://developer.mozilla.org/en-US/docs/Learn'
FROM public.courses c
CROSS JOIN (VALUES
  (1,'Foundations & Setup','install the tooling and understand the core vocabulary'),
  (2,'Core Concepts','work through the essential concepts with guided examples'),
  (3,'Hands-on Practice','apply what you learned in a small guided project'),
  (4,'Intermediate Techniques','explore patterns used in production codebases'),
  (5,'Advanced Topics','tackle performance, edge cases and best practices'),
  (6,'Capstone Project','build and present a complete end-to-end project')
) AS m(i, name, blurb);

-- SEED: resources (50)
INSERT INTO public.resources (title, description, type, url, category, difficulty, size_kb, reading_minutes, course_id, instructor_name)
SELECT
  r.title || ' — ' || c.title,
  'Curated ' || r.type || ' resource for ' || c.title || '.',
  r.type,
  CASE r.type
    WHEN 'video' THEN 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    WHEN 'link' THEN 'https://developer.mozilla.org/en-US/docs/Web'
    WHEN 'docx' THEN 'https://calibre-ebook.com/downloads/demos/demo.docx'
    WHEN 'pptx' THEN 'https://scholar.harvard.edu/files/torman_personal/files/samplepptx.pptx'
    WHEN 'xlsx' THEN 'https://go.microsoft.com/fwlink/?LinkID=521962'
    WHEN 'bibtex' THEN 'https://www.bibtex.org/Format/'
    ELSE 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  END,
  c.category, c.difficulty,
  350 + (row_number() OVER ()) * 37,
  8 + (row_number() OVER ()) % 25,
  c.id, c.instructor_name
FROM public.courses c
CROSS JOIN (VALUES
  ('Lecture Notes','pdf'),
  ('Reference Handbook','docx'),
  ('Recorded Lecture','video'),
  ('Slide Deck','pptx'),
  ('Official Documentation','link')
) AS r(title, type);

INSERT INTO public.resources (title, description, type, url, category, difficulty, size_kb, reading_minutes, instructor_name)
VALUES
('Research Bibliography — Machine Learning','BibTeX references for the ML reading list.','bibtex','https://www.bibtex.org/Format/','AI','advanced',24,10,'Dr. Karan Malhotra'),
('Semester Marks Template','Excel workbook for tracking lab marks.','xlsx','https://go.microsoft.com/fwlink/?LinkID=521962','Core CS','beginner',48,5,'Prof. Sneha Iyer');

-- SEED: quizzes
INSERT INTO public.quizzes (course_id, title, questions)
SELECT c.id, c.title || ' — Knowledge Check',
  jsonb_build_array(
    jsonb_build_object('q','Which statement best describes the goal of ' || c.title || '?','options', jsonb_build_array('Memorising syntax','Applying concepts to real problems','Avoiding practice','None of these'),'answer',1),
    jsonb_build_object('q','How much practice is recommended per week?','options', jsonb_build_array('None','1 hour','4-6 hours','24 hours'),'answer',2)
  )
FROM public.courses c;

-- SEED: announcements
INSERT INTO public.announcements (author_name, title, body, course_title) VALUES
('Dr. Anita Verma','Mid-semester review scheduled','The Web Development mid-semester review will be held on Friday at 11:00 in Lab 3. Bring your project repositories.','Full-Stack Web Development'),
('Dr. Karan Malhotra','New ML notebooks uploaded','Three new Jupyter notebooks covering model evaluation have been added to the resource library.','Machine Learning in Practice'),
('Prof. Sneha Iyer','DBMS lab submission deadline','Normalisation assignment submissions close this Sunday at 23:59.','Database Management Systems'),
('Prof. Rajeev Menon','Cloud lab credits available','Free cloud lab credits are now available for all enrolled students. Collect your voucher from the department office.','Cloud Computing Essentials');

-- SEED: demo roster
INSERT INTO public.demo_people (full_name, email, role, department, enrolled_paths, progress, streak, hours, last_active) VALUES
('Aarav Sharma','aarav.sharma@college.edu','student','Computer Science',4,82,12,64,current_date),
('Diya Patel','diya.patel@college.edu','student','Computer Science',3,74,9,51,current_date - 1),
('Rohan Gupta','rohan.gupta@college.edu','student','Software Engineering',5,91,21,88,current_date),
('Ananya Nair','ananya.nair@college.edu','student','Computer Science',2,45,4,29,current_date - 2),
('Vivaan Reddy','vivaan.reddy@college.edu','student','Software Engineering',3,63,7,42,current_date - 1),
('Ishita Joshi','ishita.joshi@college.edu','student','Computer Science',4,88,15,71,current_date),
('Kabir Singh','kabir.singh@college.edu','student','Information Technology',2,38,3,21,current_date - 4),
('Meera Krishnan','meera.krishnan@college.edu','student','Computer Science',5,96,28,102,current_date),
('Arjun Desai','arjun.desai@college.edu','student','Software Engineering',3,57,6,37,current_date - 1),
('Saanvi Rao','saanvi.rao@college.edu','student','Computer Science',4,79,11,58,current_date),
('Aditya Bose','aditya.bose@college.edu','student','Information Technology',2,41,2,24,current_date - 5),
('Riya Malhotra','riya.malhotra@college.edu','student','Computer Science',3,68,8,45,current_date - 1),
('Karthik Iyer','karthik.iyer@college.edu','student','Software Engineering',4,85,17,76,current_date),
('Nisha Chawla','nisha.chawla@college.edu','student','Computer Science',3,52,5,33,current_date - 3),
('Dev Kulkarni','dev.kulkarni@college.edu','student','Computer Science',5,93,24,95,current_date),
('Tanya Mehta','tanya.mehta@college.edu','student','Information Technology',2,47,4,27,current_date - 2),
('Yash Agarwal','yash.agarwal@college.edu','student','Software Engineering',3,71,10,49,current_date),
('Pooja Sinha','pooja.sinha@college.edu','student','Computer Science',4,80,13,62,current_date - 1),
('Manav Trivedi','manav.trivedi@college.edu','student','Computer Science',2,34,1,18,current_date - 7),
('Sara Fernandes','sara.fernandes@college.edu','student','Software Engineering',3,66,9,44,current_date),
('Dr. Anita Verma','anita.verma@college.edu','instructor','Computer Science',3,0,0,0,current_date),
('Prof. Rajeev Menon','rajeev.menon@college.edu','instructor','Computer Science',2,0,0,0,current_date),
('Prof. Sneha Iyer','sneha.iyer@college.edu','instructor','Information Technology',2,0,0,0,current_date),
('Dr. Karan Malhotra','karan.malhotra@college.edu','instructor','Artificial Intelligence',3,0,0,0,current_date),
('Dr. Leela Menon','leela.menon@college.edu','instructor','Software Engineering',1,0,0,0,current_date);