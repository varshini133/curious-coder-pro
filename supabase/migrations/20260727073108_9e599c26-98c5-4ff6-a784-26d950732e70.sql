CREATE POLICY "delete own roles" ON public.user_roles FOR DELETE TO authenticated USING (auth.uid() = user_id);
GRANT DELETE ON public.user_roles TO authenticated;