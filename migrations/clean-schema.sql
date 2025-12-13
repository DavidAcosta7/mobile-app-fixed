-- ============================================================================
-- FLUXPAY CLEAN DATABASE SCHEMA
-- Script SQL simplificado para crear/recrear todas las tablas en Supabase PostgreSQL
-- ============================================================================
-- 
-- Este script:
-- 1. Elimina la tabla users existente (con columnas en español)
-- 2. Crea todas las tablas desde cero con estructura en inglés
-- 3. Configura Row Level Security (RLS) correctamente
-- 4. Establece políticas de seguridad apropiadas
--
-- TABLAS CREADAS:
-- 1. users (usuarios del sistema - estructura en inglés)
-- 2. payments (pagos programados)
-- 3. achievements (logros de usuarios)
-- 4. streaks (rachas de pagos puntuales)
-- 5. notifications (notificaciones del sistema)
--
-- NOTA: DROP TABLE ... CASCADE elimina automáticamente las políticas RLS,
-- por lo que no se necesitan DROP POLICY explícitos.
--
-- ============================================================================

-- ============================================================================
-- PASO 1: ELIMINAR FUNCIÓN Y TABLAS EXISTENTES
-- ============================================================================
-- Eliminar función de trigger primero
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Eliminar tablas en orden inverso (tablas dependientes primero)
-- CASCADE elimina automáticamente todas las políticas RLS asociadas
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.streaks CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================================================
-- PASO 2: CREAR FUNCIÓN PARA ACTUALIZAR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PASO 3: CREAR TABLA USERS (ESTRUCTURA EN INGLÉS)
-- ============================================================================
-- IMPORTANTE: 
-- - El id debe ser UUID que coincida con auth.users.id de Supabase Auth
-- - Debe tener la columna "email" (NO "correo" ni otras variantes)
-- - Estructura completamente en inglés

CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  email_verified BOOLEAN NOT NULL DEFAULT false,
  first_login BOOLEAN NOT NULL DEFAULT true,
  suspended BOOLEAN NOT NULL DEFAULT false,
  financial_level INTEGER NOT NULL DEFAULT 1,
  experience_points INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para users
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_created_at ON public.users(created_at);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PASO 4: CREAR TABLA PAYMENTS
-- ============================================================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'COP' CHECK (currency IN ('USD', 'COP', 'EUR')),
  category TEXT NOT NULL CHECK (category IN ('SERVICIOS', 'ENTRETENIMIENTO', 'TRANSPORTE', 'SALUD', 'ALIMENTACION', 'OTROS')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'URGENT', 'COMPLETED', 'FAILED', 'OVERDUE')),
  selected_date TIMESTAMP WITH TIME ZONE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_date TIMESTAMP WITH TIME ZONE,
  auto_debit BOOLEAN NOT NULL DEFAULT false,
  payment_url TEXT,
  deep_link TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para payments
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_due_date ON public.payments(due_date);
CREATE INDEX idx_payments_user_status ON public.payments(user_id, status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PASO 5: CREAR TABLA ACHIEVEMENTS
-- ============================================================================

CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  unlocked BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  count INTEGER,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, type)
);

-- Índices para achievements
CREATE INDEX idx_achievements_user_id ON public.achievements(user_id);
CREATE INDEX idx_achievements_type ON public.achievements(type);
CREATE INDEX idx_achievements_unlocked ON public.achievements(unlocked);
CREATE INDEX idx_achievements_user_type ON public.achievements(user_id, type);

-- ============================================================================
-- PASO 6: CREAR TABLA STREAKS
-- ============================================================================

CREATE TABLE public.streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para streaks
CREATE INDEX idx_streaks_user_id ON public.streaks(user_id);
CREATE INDEX idx_streaks_active ON public.streaks(active);
CREATE INDEX idx_streaks_last_activity ON public.streaks(last_activity);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_streaks_updated_at
  BEFORE UPDATE ON public.streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PASO 7: CREAR TABLA NOTIFICATIONS
-- ============================================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('LOGRO', 'ALERTA', 'PAGO')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  priority TEXT NOT NULL DEFAULT 'MEDIA' CHECK (priority IN ('BAJA', 'MEDIA', 'ALTA')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para notifications
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- ============================================================================
-- PASO 8: HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 9: POLÍTICAS RLS PARA USERS
-- ============================================================================
-- IMPORTANTE: 
-- - auth.uid() retorna el ID del usuario autenticado (de auth.users)
-- - Las políticas verifican roles en public.users (NO en auth.users)
-- - auth.uid() se usa para autenticación, users.id para datos

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil (excepto role y suspended)
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM public.users WHERE id = auth.uid()) AND
    suspended = (SELECT suspended FROM public.users WHERE id = auth.uid())
  );

-- Los administradores pueden ver todos los usuarios
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Los administradores pueden actualizar cualquier usuario
CREATE POLICY "Admins can update all users"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Permitir inserción de usuarios (para el proceso de registro)
CREATE POLICY "Allow user creation"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- PASO 10: POLÍTICAS RLS PARA PAYMENTS
-- ============================================================================

-- Los usuarios pueden ver sus propios pagos
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden crear sus propios pagos
CREATE POLICY "Users can create own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propios pagos
CREATE POLICY "Users can update own payments"
  ON public.payments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden eliminar sus propios pagos
CREATE POLICY "Users can delete own payments"
  ON public.payments FOR DELETE
  USING (auth.uid() = user_id);

-- Los administradores pueden ver todos los pagos
CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- PASO 11: POLÍTICAS RLS PARA ACHIEVEMENTS
-- ============================================================================

-- Los usuarios pueden ver sus propios logros
CREATE POLICY "Users can view own achievements"
  ON public.achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden crear sus propios logros (para inicialización)
CREATE POLICY "Users can create own achievements"
  ON public.achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propios logros
CREATE POLICY "Users can update own achievements"
  ON public.achievements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Los administradores pueden ver todos los logros
CREATE POLICY "Admins can view all achievements"
  ON public.achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- PASO 12: POLÍTICAS RLS PARA STREAKS
-- ============================================================================

-- Los usuarios pueden ver su propia racha
CREATE POLICY "Users can view own streak"
  ON public.streaks FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden crear su propia racha
CREATE POLICY "Users can create own streak"
  ON public.streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar su propia racha
CREATE POLICY "Users can update own streak"
  ON public.streaks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Los administradores pueden ver todas las rachas
CREATE POLICY "Admins can view all streaks"
  ON public.streaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- PASO 13: POLÍTICAS RLS PARA NOTIFICATIONS
-- ============================================================================

-- Los usuarios pueden ver sus propias notificaciones
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden crear sus propias notificaciones (para el sistema)
CREATE POLICY "Users can create own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias notificaciones (marcar como leídas)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden eliminar sus propias notificaciones
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Los administradores pueden ver todas las notificaciones
CREATE POLICY "Admins can view all notifications"
  ON public.notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- COMENTARIOS FINALES
-- ============================================================================

COMMENT ON TABLE public.users IS 'Usuarios del sistema FluxPay - Estructura en inglés';
COMMENT ON TABLE public.payments IS 'Pagos programados de los usuarios';
COMMENT ON TABLE public.achievements IS 'Logros y achievements de los usuarios';
COMMENT ON TABLE public.streaks IS 'Rachas de pagos puntuales';
COMMENT ON TABLE public.notifications IS 'Notificaciones del sistema';

COMMENT ON COLUMN public.users.id IS 'UUID que debe coincidir con auth.users.id de Supabase Auth';
COMMENT ON COLUMN public.users.email IS 'Email del usuario (requerido, único)';
COMMENT ON COLUMN public.users.role IS 'Rol del usuario: USER o ADMIN (almacenado en public.users, NO en auth.users)';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- 
-- INSTRUCCIONES:
-- 1. Ejecuta este script completo en Supabase SQL Editor
-- 2. Verifica que todas las tablas se hayan creado correctamente
-- 3. La tabla users ahora tiene estructura en inglés con columna "email"
-- 4. Las políticas RLS usan auth.uid() para autenticación y public.users para roles
-- 5. DROP TABLE ... CASCADE elimina automáticamente las políticas RLS
--
-- ============================================================================

