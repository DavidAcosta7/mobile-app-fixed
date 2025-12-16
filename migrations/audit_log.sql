-- ============================================================================
-- TABLA AUDIT_LOG
-- Registra todas las acciones realizadas por administradores
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  admin_name TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'CHANGE_PASSWORD',
    'CHANGE_ROLE',
    'ASSIGN_XP',
    'CHANGE_LEVEL',
    'SUSPEND_USER',
    'ENABLE_USER',
    'DELETE_USER',
    'VIEW_USER'
  )),
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_name TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user_id ON public.audit_logs(target_user_id);

-- Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;

-- Política: Solo admins pueden ver los logs de auditoría
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.role = 'ADMIN'
    )
  );

-- Política: Solo admins pueden insertar logs
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.role = 'ADMIN'
    )
  );

