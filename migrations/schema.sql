-- ============================================================================
-- FLUXPAY DATABASE SCHEMA
-- Script SQL completo para crear todas las tablas en Supabase PostgreSQL
-- ============================================================================
-- 
-- Este script crea:
-- 1. Tabla users (usuarios del sistema)
-- 2. Tabla payments (pagos programados)
-- 3. Tabla achievements (logros de usuarios)
-- 4. Tabla streaks (rachas de pagos puntuales)
-- 5. Tabla notifications (notificaciones del sistema)
--
-- Incluye:
-- - Constraints (PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL)
-- - Índices para optimizar consultas
-- - Row Level Security (RLS) habilitado
-- - Políticas RLS para seguridad
--
-- ============================================================================

-- Limpiar tablas existentes (opcional - descomentar si necesitas resetear)
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS achievements CASCADE;
-- DROP TABLE IF EXISTS streaks CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- 1. TABLA USERS
-- ============================================================================
-- Almacena información de los usuarios del sistema
-- El id debe coincidir con auth.users.id de Supabase Auth

CREATE TABLE IF NOT EXISTS users (
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
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. TABLA PAYMENTS
-- ============================================================================
-- Almacena los pagos programados de los usuarios

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. TABLA ACHIEVEMENTS
-- ============================================================================
-- Almacena los logros/achievements de los usuarios

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(type);
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked ON achievements(unlocked);
CREATE INDEX IF NOT EXISTS idx_achievements_user_type ON achievements(user_id, type);

-- ============================================================================
-- 4. TABLA STREAKS
-- ============================================================================
-- Almacena las rachas de pagos puntuales de los usuarios

CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para streaks
CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_streaks_active ON streaks(active);
CREATE INDEX IF NOT EXISTS idx_streaks_last_activity ON streaks(last_activity);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_streaks_updated_at
  BEFORE UPDATE ON streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. TABLA NOTIFICATIONS
-- ============================================================================
-- Almacena las notificaciones del sistema para los usuarios

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('LOGRO', 'ALERTA', 'PAGO')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  priority TEXT NOT NULL DEFAULT 'MEDIA' CHECK (priority IN ('BAJA', 'MEDIA', 'ALTA')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS RLS PARA USERS
-- ============================================================================

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil (excepto role y suspended)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM users WHERE id = auth.uid()) AND
    suspended = (SELECT suspended FROM users WHERE id = auth.uid())
  );

-- Los administradores pueden ver todos los usuarios
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Los administradores pueden actualizar cualquier usuario
CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Permitir inserción de usuarios (para el proceso de registro)
CREATE POLICY "Allow user creation"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- POLÍTICAS RLS PARA PAYMENTS
-- ============================================================================

-- Los usuarios pueden ver sus propios pagos
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden crear sus propios pagos
CREATE POLICY "Users can create own payments"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propios pagos
CREATE POLICY "Users can update own payments"
  ON payments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden eliminar sus propios pagos
CREATE POLICY "Users can delete own payments"
  ON payments FOR DELETE
  USING (auth.uid() = user_id);

-- Los administradores pueden ver todos los pagos
CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- POLÍTICAS RLS PARA ACHIEVEMENTS
-- ============================================================================

-- Los usuarios pueden ver sus propios logros
CREATE POLICY "Users can view own achievements"
  ON achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden crear sus propios logros (para inicialización)
CREATE POLICY "Users can create own achievements"
  ON achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propios logros
CREATE POLICY "Users can update own achievements"
  ON achievements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Los administradores pueden ver todos los logros
CREATE POLICY "Admins can view all achievements"
  ON achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- POLÍTICAS RLS PARA STREAKS
-- ============================================================================

-- Los usuarios pueden ver su propia racha
CREATE POLICY "Users can view own streak"
  ON streaks FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden crear su propia racha
CREATE POLICY "Users can create own streak"
  ON streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar su propia racha
CREATE POLICY "Users can update own streak"
  ON streaks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Los administradores pueden ver todas las rachas
CREATE POLICY "Admins can view all streaks"
  ON streaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- POLÍTICAS RLS PARA NOTIFICATIONS
-- ============================================================================

-- Los usuarios pueden ver sus propias notificaciones
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden crear sus propias notificaciones (para el sistema)
CREATE POLICY "Users can create own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias notificaciones (marcar como leídas)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden eliminar sus propias notificaciones
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Los administradores pueden ver todas las notificaciones
CREATE POLICY "Admins can view all notifications"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- COMENTARIOS FINALES
-- ============================================================================

COMMENT ON TABLE users IS 'Usuarios del sistema FluxPay';
COMMENT ON TABLE payments IS 'Pagos programados de los usuarios';
COMMENT ON TABLE achievements IS 'Logros y achievements de los usuarios';
COMMENT ON TABLE streaks IS 'Rachas de pagos puntuales';
COMMENT ON TABLE notifications IS 'Notificaciones del sistema';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

