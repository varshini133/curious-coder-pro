-- 1. Move has_role out of the exposed API schema
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "instructors create courses" ON public.courses;
CREATE POLICY "instructors create courses" ON public.courses
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'instructor') AND created_by = auth.uid());

DROP POLICY IF EXISTS "instructors create resources" ON public.resources;
CREATE POLICY "instructors create resources" ON public.resources
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'instructor') AND created_by = auth.uid());

DROP POLICY IF EXISTS "instructors post announcements" ON public.announcements;
CREATE POLICY "instructors post announcements" ON public.announcements
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'instructor') AND author_id = auth.uid());

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 2. Announcements: explicit owner-scoped UPDATE policy
CREATE POLICY "instructors update own announcements" ON public.announcements
FOR UPDATE TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- 3. demo_people roster: instructors only
DROP POLICY IF EXISTS "roster readable" ON public.demo_people;
CREATE POLICY "roster readable by instructors" ON public.demo_people
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'instructor'));