import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { syncSupabaseUser } from '../services/auth.service';
import { userService, User as DBUser } from '../services/users.service';

export function useAuth() {
  const [user, setUser] = useState<DBUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabaseUser?.id) return;

    const channel = supabase
      .channel(`user-profile-${supabaseUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${supabaseUser.id}`,
        },
        async () => {
          try {
            const refreshed = await userService.findById(supabaseUser.id);
            if (refreshed) setUser(refreshed as any);
          } catch (e) {
            console.error('Error refreshing user via realtime:', e);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabaseUser?.id]);

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        syncUser(session.user);
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Verificar si es un flujo de recuperación de contraseña
      const isPasswordRecoveryFlow = 
        (event === 'SIGNED_IN' && session?.user?.app_metadata?.provider === 'email') ||
        (event === 'PASSWORD_RECOVERY');

      if (isPasswordRecoveryFlow) {
        // El usuario ha hecho click en el link de recuperación
        // La sesión temporal está establecida, pero no debemos sincronizar el usuario todavía
        if (session?.user) {
          setSupabaseUser(session.user);
          setIsPasswordRecovery(true);
          setLoading(false);
        }
        return;
      }

      // Usar el valor actual de isPasswordRecovery a través de una función de actualización
      // para evitar dependencias en el array de dependencias
      setIsPasswordRecovery(current => {
        // Resetear el estado de recuperación si no estamos en un flujo de recuperación
        if (current && event !== 'SIGNED_IN') {
          return false;
        }
        return current;
      });

      if (session?.user) {
        setSupabaseUser(session.user);
        await syncUser(session.user);
      } else {
        setSupabaseUser(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // No dependencies needed as we're using functional updates

  const syncUser = async (supabaseUser: User) => {
    try {
      const dbUser = await syncSupabaseUser(supabaseUser);
      
      // Verificar si el usuario está suspendido
      if (dbUser.suspended) {
        // Cerrar sesión si el usuario está suspendido
        await supabase.auth.signOut();
        setUser(null);
        setSupabaseUser(null);
        setLoading(false);
        throw new Error('Tu cuenta ha sido suspendida. Contacta al administrador.');
      }
      
      setUser(dbUser);
    } catch (error: any) {
      console.error('Error syncing user:', error);
      // Si el error es por suspensión, no lo logueamos como error normal
      if (error.message && error.message.includes('suspendida')) {
        throw error;
      }
      // Para otros errores, solo los logueamos
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      await syncUser(data.user);
    }

    return data;
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      await syncUser(data.user);
    }

    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setUser(null);
    setSupabaseUser(null);
  };

  const refreshUser = async () => {
    if (supabaseUser) {
      await syncUser(supabaseUser);
    }
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }
  };

  return {
    user,
    supabaseUser,
    loading,
    isPasswordRecovery,
    signIn,
    signUp,
    signOut,
    refreshUser,
    updatePassword,
    isAuthenticated: !!user,
    isAdmin: (user?.role || '').toString().toLowerCase() === 'admin',
  };
}

