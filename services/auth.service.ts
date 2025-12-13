import { supabase } from '../lib/supabase';
import { userService } from './users.service';
import { achievementService } from './achievements.service';
import { streakService } from './streaks.service';

/**
 * Sincroniza un usuario de Supabase Auth con nuestra base de datos
 * Crea el usuario si no existe y inicializa sus datos por defecto
 */
export async function syncSupabaseUser(supabaseUser: {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
  email_confirmed_at?: string | null;
}) {
  if (!supabaseUser.email) {
    throw new Error('User email is required');
  }

  // Buscar usuario existente
  let dbUser = await userService.findByEmail(supabaseUser.email);

  if (!dbUser) {
    // Crear nuevo usuario
    // IMPORTANTE: El id debe coincidir con auth.users.id para que pase la política RLS
    dbUser = await userService.create({
      id: supabaseUser.id, // Incluir el id del usuario de Supabase Auth
      email: supabaseUser.email,
      name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
      photo_url: supabaseUser.user_metadata?.avatar_url,
    });

    // Actualizar email_verified si es necesario
    if (supabaseUser.email_confirmed_at !== null) {
      dbUser = await userService.update(dbUser.id, {
        email_verified: true,
      });
    }

    // Inicializar logros por defecto
    await achievementService.initializeDefaultAchievements(dbUser.id);

    // Crear racha inicial
    await streakService.findByUserId(dbUser.id);
  } else {
    // Actualizar datos si es necesario
    const updates: any = {};
    
    if (supabaseUser.user_metadata?.name && supabaseUser.user_metadata.name !== dbUser.name) {
      updates.name = supabaseUser.user_metadata.name;
    }
    
    if (supabaseUser.user_metadata?.avatar_url && supabaseUser.user_metadata.avatar_url !== dbUser.photo_url) {
      updates.photo_url = supabaseUser.user_metadata.avatar_url;
    }
    
    if (supabaseUser.email_confirmed_at && !dbUser.email_verified) {
      updates.email_verified = true;
    }

    if (Object.keys(updates).length > 0) {
      dbUser = await userService.update(dbUser.id, updates);
    }
  }

  return dbUser;
}

