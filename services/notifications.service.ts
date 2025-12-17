import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
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

export type ScheduledNotificationKind = '3_days' | '2_days' | '1_day' | 'same_day';

export type NotificationPreferences = {
  user_id: string;
  notifications_enabled: boolean;
  notify_3_days: boolean;
  notify_2_days: boolean;
  notify_1_day: boolean;
  notify_same_day: boolean;
  same_day_interval: number;
};

let localConfigured = false;

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

export class NotificationService {
  static isSupportedInCurrentRuntime() {
    const anyConstants = Constants as any;
    const execEnv = anyConstants?.executionEnvironment;
    if (execEnv === 'storeClient') {
      return false;
    }
    return anyConstants?.appOwnership !== 'expo';
  }

  static async getNotificationsModule() {
    const Notifications = await import('expo-notifications');
    return Notifications;
  }

  static async configure() {
    if (localConfigured) return;

    if (!this.isSupportedInCurrentRuntime()) {
      localConfigured = true;
      return;
    }

    const Notifications = await this.getNotificationsModule();

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'FluxPay Recordatorios',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    }

    localConfigured = true;
  }

  static async requestPermissions(): Promise<boolean> {
    await this.configure();

    if (!this.isSupportedInCurrentRuntime()) {
      return false;
    }

    if (!Device.isDevice) {
      return false;
    }

    const Notifications = await this.getNotificationsModule();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  static async cancelAll() {
    await this.configure();
    if (!this.isSupportedInCurrentRuntime()) return;
    const Notifications = await this.getNotificationsModule();
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  static async schedulePaymentNotifications(payment: any, userId: string, preferences: NotificationPreferences) {
    await this.configure();
    if (!this.isSupportedInCurrentRuntime()) return;

    if (!preferences.notifications_enabled) {
      await this.cancelPaymentNotifications(payment.id);
      return;
    }

    await this.cancelPaymentNotifications(payment.id);

    const dueDate = new Date(payment.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (preferences.notify_3_days) {
      const notify3Days = new Date(dueDate);
      notify3Days.setDate(notify3Days.getDate() - 3);
      notify3Days.setHours(9, 0, 0, 0);
      if (notify3Days > today) {
        await this.scheduleOne(payment, userId, '3_days', 'Pago próximo en 3 días', `${payment.name} - $${payment.amount}`, notify3Days);
      }
    }

    if (preferences.notify_2_days) {
      const notify2Days = new Date(dueDate);
      notify2Days.setDate(notify2Days.getDate() - 2);
      notify2Days.setHours(9, 0, 0, 0);
      if (notify2Days > today) {
        await this.scheduleOne(payment, userId, '2_days', 'Pago próximo en 2 días', `${payment.name} - $${payment.amount}`, notify2Days);
      }
    }

    if (preferences.notify_1_day) {
      const notify1Day = new Date(dueDate);
      notify1Day.setDate(notify1Day.getDate() - 1);
      notify1Day.setHours(9, 0, 0, 0);
      if (notify1Day > today) {
        await this.scheduleOne(payment, userId, '1_day', 'Pago mañana', `${payment.name} - $${payment.amount}`, notify1Day);
      }
    }

    if (preferences.notify_same_day) {
      await this.scheduleSameDayNotifications(payment, userId, dueDate, preferences.same_day_interval);
    }
  }

  static async rescheduleAllUserPayments(userId: string, preferences: NotificationPreferences) {
    await this.configure();
    if (!this.isSupportedInCurrentRuntime()) return;

    if (!preferences.notifications_enabled) {
      await this.cancelAll();
      return;
    }

    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching payments for reschedule:', error);
      return;
    }

    for (const payment of payments || []) {
      await this.schedulePaymentNotifications(payment, userId, preferences);
    }
  }

  static async scheduleOne(
    payment: any,
    userId: string,
    type: ScheduledNotificationKind,
    title: string,
    body: string,
    when: Date
  ) {
    const Notifications = await this.getNotificationsModule();

    if (when.getTime() <= Date.now()) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          paymentId: payment.id,
          userId,
          type,
          paymentName: payment.name,
          dueDate: payment.due_date,
          screen: '/',
        },
        sound: 'default',
      },
      trigger: {
        type: 'date',
        date: when,
        channelId: Platform.OS === 'android' ? 'default' : undefined,
      } as any,
    });
  }

  static async scheduleSameDayNotifications(
    payment: any,
    userId: string,
    dueDate: Date,
    intervalMinutes: number
  ) {
    const Notifications = await this.getNotificationsModule();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDateOnly = new Date(dueDate);
    dueDateOnly.setHours(0, 0, 0, 0);

    if (dueDateOnly < today) {
      return;
    }

    const startHour = 8;
    const endHour = 20;
    const totalMinutes = (endHour - startHour) * 60;
    const step = Math.max(15, intervalMinutes || 60);
    const notificationCount = Math.floor(totalMinutes / step);

    for (let i = 0; i < notificationCount; i++) {
      const notifyTime = new Date(dueDate);
      notifyTime.setHours(startHour, i * step, 0, 0);

      if (notifyTime.getTime() <= Date.now()) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '¡Pago HOY!',
          body: `${payment.name} vence hoy - $${payment.amount}`,
          data: {
            paymentId: payment.id,
            userId,
            type: 'same_day',
            paymentName: payment.name,
            dueDate: payment.due_date,
            screen: '/',
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: 'date',
          date: notifyTime,
          channelId: Platform.OS === 'android' ? 'default' : undefined,
        } as any,
      });
    }
  }

  static async cancelPaymentNotifications(paymentId: string) {
    await this.configure();
    if (!this.isSupportedInCurrentRuntime()) return;

    const Notifications = await this.getNotificationsModule();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduled as any[]) {
      const data = (notification?.content?.data ?? {}) as any;
      if (data.paymentId === paymentId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }

  static async saveToHistory(params: {
    userId: string;
    paymentId: string;
    title: string;
    body: string;
    type: ScheduledNotificationKind;
    paymentName?: string;
    dueDate?: string | Date;
  }) {
    try {
      const due = params.dueDate ? new Date(params.dueDate) : null;
      const { error } = await supabase.from('notification_history').insert({
        user_id: params.userId,
        payment_id: params.paymentId,
        title: params.title,
        body: params.body,
        type: params.type,
        payment_name: params.paymentName ?? null,
        due_date: due ? due.toISOString().split('T')[0] : null,
      });

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          return;
        }
        console.error('Error saving notification to history:', error);
      }
    } catch (error) {
      console.error('Error saving notification to history:', error);
    }
  }

  static async getHistory(userId: string) {
    const { data, error } = await supabase
      .from('notification_history')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(100);

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return [];
      }
      console.error('Error fetching notification history:', error);
      return [];
    }

    return data || [];
  }

  static async getPreferences(userId: string): Promise<NotificationPreferences> {
    const fallback: NotificationPreferences = {
      user_id: userId,
      notifications_enabled: false,
      notify_3_days: true,
      notify_2_days: true,
      notify_1_day: true,
      notify_same_day: true,
      same_day_interval: 60,
    };

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      if (error && (error.code === 'PGRST205' || error.message?.includes('Could not find the table'))) {
        return fallback;
      }
      const { data: newData } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: userId,
          notifications_enabled: fallback.notifications_enabled,
          notify_3_days: fallback.notify_3_days,
          notify_2_days: fallback.notify_2_days,
          notify_1_day: fallback.notify_1_day,
          notify_same_day: fallback.notify_same_day,
          same_day_interval: fallback.same_day_interval,
        })
        .select()
        .single();

      return (newData as any) || fallback;
    }

    return {
      user_id: userId,
      notifications_enabled: !!(data as any).notifications_enabled,
      notify_3_days: !!(data as any).notify_3_days,
      notify_2_days: !!(data as any).notify_2_days,
      notify_1_day: !!(data as any).notify_1_day,
      notify_same_day: !!(data as any).notify_same_day,
      same_day_interval: typeof (data as any).same_day_interval === 'number' ? (data as any).same_day_interval : 60,
    };
  }

  static async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>) {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }
}

