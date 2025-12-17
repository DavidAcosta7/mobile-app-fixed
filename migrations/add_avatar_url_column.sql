-- Agregar columna avatar_url a la tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Crear índice para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users(avatar_url);
