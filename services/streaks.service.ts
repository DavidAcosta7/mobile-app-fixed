import { supabase } from '../lib/supabase';
import { differenceInDays } from 'date-fns';

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  start_date?: string | null;
  last_activity?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const streakService = {
  async findByUserId(userId: string): Promise<Streak> {
    const { data, error } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error finding streak:', error);
    }

    if (!data) {
      // Crear streak inicial si no existe
      const { data: newStreak, error: createError } = await supabase
        .from('streaks')
        .insert({
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
          active: false,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Error creating streak: ${createError.message}`);
      }

      return newStreak;
    }

    return data;
  },

  async update(userId: string): Promise<Streak> {
    const today = new Date();
    let streak = await this.findByUserId(userId);

    if (!streak.last_activity) {
      // Primera actividad
      const { data: updated, error } = await supabase
        .from('streaks')
        .update({
          current_streak: 1,
          longest_streak: 1,
          start_date: today.toISOString(),
          last_activity: today.toISOString(),
          active: true,
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Error updating streak: ${error.message}`);
      }

      return updated;
    }

    const lastActivity = new Date(streak.last_activity);
    const daysDiff = differenceInDays(today, lastActivity);

    if (daysDiff === 1) {
      // Continuar racha
      const newStreak = streak.current_streak + 1;
      const newLongest = Math.max(newStreak, streak.longest_streak);

      const { data: updated, error } = await supabase
        .from('streaks')
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
          last_activity: today.toISOString(),
          active: true,
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Error updating streak: ${error.message}`);
      }

      return updated;
    } else if (daysDiff > 1) {
      // Racha rota, empezar de nuevo
      const { data: updated, error } = await supabase
        .from('streaks')
        .update({
          current_streak: 1,
          start_date: today.toISOString(),
          last_activity: today.toISOString(),
          active: true,
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Error updating streak: ${error.message}`);
      }

      return updated;
    }

    // Mismo día, no actualizar
    return streak;
  },

  async reset(userId: string): Promise<Streak> {
    const { data, error } = await supabase
      .from('streaks')
      .update({
        current_streak: 0,
        active: false,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error resetting streak: ${error.message}`);
    }

    return data;
  },
};

