# Migración de Tabla de Auditoría

## Problema
Si ves el error: `Could not find the table 'public.audit_logs' in the schema cache`, significa que la tabla de auditoría no existe en tu base de datos.

## Solución

### Paso 1: Accede al SQL Editor de Supabase
1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor** en el menú lateral
3. Haz clic en **New Query**

### Paso 2: Ejecuta la Migración
Copia y pega el contenido completo del archivo `migrations/audit_log.sql` en el editor SQL y ejecuta la consulta.

**O copia este SQL directamente:**

```sql
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
```

### Paso 3: Verificar
Después de ejecutar el SQL, deberías ver un mensaje de éxito. La tabla `audit_logs` ahora estará disponible y el panel de administración funcionará correctamente.

## Nota
La aplicación ahora maneja el error de manera elegante si la tabla no existe, pero para que la funcionalidad de auditoría funcione completamente, **debes ejecutar esta migración**.

