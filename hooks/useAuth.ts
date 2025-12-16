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
      if (event === 'PASSWORD_RECOVERY') {
        // El usuario ha hecho click en el link de recuperación
        // La sesión temporal está establecida, pero no debemos sincronizar el usuario todavía
        // El usuario será redirigido a reset-password para cambiar la contraseña
        if (session?.user) {
          setSupabaseUser(session.user);
          setIsPasswordRecovery(true);
          setLoading(false);
        }
        return;
      }

      // Si es otro evento y hay una sesión de recuperación, limpiarla
      if (isPasswordRecovery && event !== 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(false);
      }

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
  }, []);

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
    isAdmin: user?.role === 'ADMIN',
  };
}

