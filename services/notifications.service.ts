import { supabase } from '../lib/supabase';

export type NotificationType = 'LOGRO' | 'ALERTA' | 'PAGO';
export type NotificationPriority = 'BAJA' | 'MEDIA' | 'ALTA';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  priority: NotificationPriority;
  created_at: string;
}

export interface CreateNotificationInput {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
}

export const notificationService = {
  async create(data: CreateNotificationInput): Promise<Notification> {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        ...data,
        priority: data.priority || 'MEDIA',
        read: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating notification: ${error.message}`);
    }

    return notification;
  },

  async findByUserId(userId: string, unreadOnly?: boolean): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error finding notifications:', error);
      return [];
    }

    return data || [];
  },

  async markAsRead(id: string): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error marking notification as read: ${error.message}`);
    }

    return data;
  },

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      throw new Error(`Error marking all notifications as read: ${error.message}`);
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error deleting notification: ${error.message}`);
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  },
};

