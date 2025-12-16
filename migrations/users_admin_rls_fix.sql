-- Fix admin RLS policies to be case-insensitive for role values.
-- This enables admins with role 'admin' or 'ADMIN' to update/view all users.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND lower(u.role) = 'admin'
    )
  );

CREATE POLICY "Admins can update all users"
  ON public.users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND lower(u.role) = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND lower(u.role) = 'admin'
    )
  );
