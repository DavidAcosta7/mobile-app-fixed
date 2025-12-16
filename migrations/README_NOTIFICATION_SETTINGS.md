# Migración: Tabla notification_settings

Esta migración crea la tabla necesaria para almacenar las preferencias de notificaciones push de los usuarios.

## Pasos para ejecutar la migración:

1. Abre tu proyecto en Supabase Dashboard
2. Ve a la sección **SQL Editor**
3. Copia y pega el contenido completo del archivo `notification_settings.sql`
4. Haz clic en **Run** para ejecutar la migración

## ¿Qué hace esta migración?

- Crea la tabla `notification_settings` con los siguientes campos:
  - `enabled`: Si las notificaciones están habilitadas
  - `three_days_before`: Notificar 3 días antes
  - `two_days_before`: Notificar 2 días antes
  - `one_day_before`: Notificar 1 día antes
  - `same_day`: Notificar el mismo día
  - `sound_enabled`: Si el sonido está habilitado

- Configura Row Level Security (RLS) para que cada usuario solo pueda ver y modificar sus propias configuraciones

## Nota importante:

Esta migración requiere que la función `update_updated_at_column()` ya exista en tu base de datos. Si no existe, ejecuta primero la migración que la crea (generalmente está en `schema.sql` o `complete-schema.sql`).

