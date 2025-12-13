import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  photo_url?: string | null;
  role: 'USER' | 'ADMIN';
  email_verified: boolean;
  first_login: boolean;
  suspended: boolean;
  financial_level: number;
  experience_points: number;
  streak_days: number;
  created_at: string;
  updated_at: string;
}

export const userService = {
  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error finding user:', error);
      return null;
    }

    return data;
  },

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error finding user by email:', error);
      return null;
    }

    return data;
  },

  async create(data: {
    id: string; // IMPORTANTE: debe coincidir con auth.users.id
    email: string;
    name: string;
    phone?: string;
    photo_url?: string;
    role?: 'USER' | 'ADMIN';
  }): Promise<User> {
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        id: data.id, // Incluir el id del usuario de Supabase Auth
        email: data.email,
        name: data.name,
        phone: data.phone,
        photo_url: data.photo_url,
        role: data.role || 'USER',
        email_verified: false,
        first_login: true,
        suspended: false,
        financial_level: 1,
        experience_points: 0,
        streak_days: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }

    return user;
  },

  async update(id: string, data: {
    name?: string;
    phone?: string;
    photo_url?: string;
    email_verified?: boolean;
    first_login?: boolean;
    suspended?: boolean;
    financial_level?: number;
    experience_points?: number;
    streak_days?: number;
  }): Promise<User> {
    const { data: user, error } = await supabase
      .from('users')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }

    return user;
  },

  async updateExperience(id: string, points: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');

    const newPoints = user.experience_points + points;
    const newLevel = Math.floor(newPoints / 100) + 1;

    return this.update(id, {
      experience_points: newPoints,
      financial_level: newLevel,
    });
  },

  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting all users:', error);
      return [];
    }

    return data || [];
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  },
};

