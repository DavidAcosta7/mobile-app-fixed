-- ============================================================================
-- MIGRACIÓN: Agregar columna same_day_interval_minutes
-- ============================================================================
-- Agrega la columna para configurar el intervalo de notificaciones del mismo día
-- Si la tabla ya existe, ejecuta esta migración para agregar la nueva columna

-- Agregar columna si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notification_settings' 
    AND column_name = 'same_day_interval_minutes'
  ) THEN
    ALTER TABLE public.notification_settings 
    ADD COLUMN same_day_interval_minutes INTEGER NOT NULL DEFAULT 60;
  END IF;
END $$;

