-- Adds fields required for admin panel moderation and gamification

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active';
-- Values: 'active', 'suspended'

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user';
-- Values: 'user', 'admin'

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS financial_level INTEGER DEFAULT 1;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS experience_points INTEGER DEFAULT 0;
