import { supabase } from '../lib/supabase';

export interface Achievement {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  points: number;
  unlocked: boolean;
  unlocked_at?: string | null;
  count?: number | null;
  icon?: string | null;
  created_at: string;
}

export interface CreateAchievementInput {
  user_id: string;
  type: string;
  title: string;
  description: string;
  points: number;
  icon?: string;
}

export const achievementService = {
  async create(data: CreateAchievementInput): Promise<Achievement> {
    const { data: achievement, error } = await supabase
      .from('achievements')
      .insert({
        ...data,
        unlocked: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating achievement: ${error.message}`);
    }

    return achievement;
  },

  async findByUserId(userId: string): Promise<Achievement[]> {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error finding achievements:', error);
      return [];
    }

    return data || [];
  },

  async findByUserIdAndType(userId: string, type: string): Promise<Achievement | null> {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .single();

    if (error) {
      console.error('Error finding achievement by type:', error);
      return null;
    }

    return data;
  },

  async unlock(userId: string, type: string, count?: number): Promise<Achievement> {
    const achievement = await this.findByUserIdAndType(userId, type);
    
    if (!achievement) {
      throw new Error(`Achievement ${type} not found for user ${userId}`);
    }

    if (achievement.unlocked && type !== 'mes_perfecto') {
      return achievement;
    }

    const updateData: any = {
      unlocked: true,
      unlocked_at: new Date().toISOString(),
    };

    if (type === 'mes_perfecto' && count !== undefined) {
      updateData.count = (achievement.count || 0) + count;
    }

    const { data: updated, error } = await supabase
      .from('achievements')
      .update(updateData)
      .eq('id', achievement.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error unlocking achievement: ${error.message}`);
    }

    return updated;
  },

  async initializeDefaultAchievements(userId: string): Promise<void> {
    const defaultAchievements = [
      {
        type: 'primer_pago',
        title: 'Agrega tu primer pago',
        description: 'Registraste tu primer pago en FluxPay',
        points: 50,
        icon: '🎯',
      },
      {
        type: 'racha_3',
        title: 'Racha 3 días',
        description: '3 días consecutivos de pagos puntuales',
        points: 30,
        icon: '🔥',
      },
      {
        type: 'racha_5',
        title: 'Racha 5 días',
        description: '5 días consecutivos de pagos puntuales',
        points: 50,
        icon: '🔥',
      },
      {
        type: 'racha_10',
        title: 'Racha 10 días',
        description: '10 días consecutivos de pagos puntuales',
        points: 100,
        icon: '🔥',
      },
      {
        type: 'racha_15',
        title: 'Racha 15 días',
        description: '15 días consecutivos de pagos puntuales',
        points: 150,
        icon: '🔥',
      },
      {
        type: 'racha_20',
        title: 'Racha 20 días',
        description: '20 días consecutivos de pagos puntuales',
        points: 200,
        icon: '🔥',
      },
      {
        type: 'racha_30',
        title: 'Racha 30 días',
        description: '30 días consecutivos de pagos puntuales',
        points: 300,
        icon: '🔥',
      },
      {
        type: 'mes_perfecto',
        title: 'Mes Perfecto',
        description: 'Completaste el 100% de tus pagos este mes',
        points: 200,
        icon: '🥇',
      },
      {
        type: 'nivel_2',
        title: 'Nivel Financiero 2',
        description: 'Alcanzaste nivel 2 de experiencia',
        points: 0,
        icon: '⭐',
      },
      {
        type: 'nivel_3',
        title: 'Nivel Financiero 3',
        description: 'Alcanzaste nivel 3 de experiencia',
        points: 0,
        icon: '⭐',
      },
      {
        type: 'nivel_5',
        title: 'Nivel Financiero 5',
        description: 'Alcanzaste nivel 5 de experiencia',
        points: 0,
        icon: '⭐',
      },
      {
        type: 'nivel_10',
        title: 'Nivel Financiero 10',
        description: 'Alcanzaste nivel 10 de experiencia',
        points: 0,
        icon: '⭐',
      },
      {
        type: 'sin_atrasos',
        title: 'Sin atrasos 3 meses',
        description: '90 días sin pagos atrasados',
        points: 500,
        icon: '💎',
      },
    ];

    // Verificar si ya existen logros para este usuario
    const existing = await this.findByUserId(userId);
    if (existing.length > 0) {
      return; // Ya inicializados
    }

    // Crear todos los logros por defecto
    const { error } = await supabase
      .from('achievements')
      .insert(
        defaultAchievements.map(ach => ({
          ...ach,
          user_id: userId,
          unlocked: false,
        }))
      );

    if (error) {
      console.error('Error initializing achievements:', error);
    }
  },
};

