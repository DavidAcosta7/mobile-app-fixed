import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

export type NotificationSettings = {
  enabled: boolean;
  three_days_before: boolean;
  two_days_before: boolean;
  one_day_before: boolean;
  same_day: boolean;
  same_day_interval_minutes: number;
};

let configured = false;

export const pushNotificationsService = {
  isSupportedInCurrentRuntime() {
    // Expo Go on SDK 53+ does not support remote push features from expo-notifications.
    // We only schedule local notifications, but importing expo-notifications in Expo Go
    // can still trigger warnings due to push token auto-registration side effects.
    // In Expo Go, we skip notifications entirely to avoid the runtime warning/error.
    const anyConstants = Constants as any;
    const execEnv = anyConstants?.executionEnvironment;
    if (execEnv === 'storeClient') {
      return false;
    }
    return anyConstants?.appOwnership !== 'expo';
  },

  async getNotificationsModule() {
    const Notifications = await import('expo-notifications');
    return Notifications;
  },

  async configure() {
    if (configured) return;

    if (!this.isSupportedInCurrentRuntime()) {
      configured = true;
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
      await Notifications.setNotificationChannelAsync('payments', {
        name: 'Recordatorios de pagos',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    configured = true;
  },

  async requestPermissions() {
    await this.configure();

    if (!this.isSupportedInCurrentRuntime()) {
      return 'denied';
    }

    const Notifications = await this.getNotificationsModule();

    const { status } = await Notifications.requestPermissionsAsync();
    return status;
  },

  async cancelAll() {
    await this.configure();

    if (!this.isSupportedInCurrentRuntime()) return;

    const Notifications = await this.getNotificationsModule();
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  async cancelPaymentNotifications(paymentId: string) {
    await this.configure();

    if (!this.isSupportedInCurrentRuntime()) return;

    const Notifications = await this.getNotificationsModule();

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const targets = scheduled.filter((n: any) => (n.content?.data as any)?.paymentId === paymentId);

    await Promise.all(
      targets.map((n: any) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  },

  async getOrCreateSettings(userId: string): Promise<NotificationSettings> {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        const defaults: NotificationSettings = {
          enabled: true,
          three_days_before: true,
          two_days_before: true,
          one_day_before: true,
          same_day: true,
          same_day_interval_minutes: 60,
        };

        await supabase.from('notification_settings').upsert(
          {
            user_id: userId,
            ...defaults,
          },
          { onConflict: 'user_id' }
        );

        return defaults;
      }
      throw error;
    }

    return {
      enabled: !!data.enabled,
      three_days_before: !!data.three_days_before,
      two_days_before: !!data.two_days_before,
      one_day_before: !!data.one_day_before,
      same_day: !!data.same_day,
      same_day_interval_minutes: typeof data.same_day_interval_minutes === 'number' ? data.same_day_interval_minutes : 60,
    };
  },

  async schedulePaymentNotifications(payment: any, preferences: NotificationSettings) {
    await this.configure();

    if (!this.isSupportedInCurrentRuntime()) return;

    await this.cancelPaymentNotifications(payment.id);

    if (!preferences.enabled) return;

    const dueDate = new Date(payment.due_date);

    if (preferences.three_days_before) {
      await this.scheduleNotification(payment, dueDate, -3);
    }
    if (preferences.two_days_before) {
      await this.scheduleNotification(payment, dueDate, -2);
    }
    if (preferences.one_day_before) {
      await this.scheduleNotification(payment, dueDate, -1);
    }
    if (preferences.same_day) {
      await this.scheduleSameDayNotifications(payment, dueDate, preferences.same_day_interval_minutes);
    }
  },

  async scheduleNotification(payment: any, dueDate: Date, daysOffset: number) {
    if (!this.isSupportedInCurrentRuntime()) return;

    const Notifications = await this.getNotificationsModule();

    const notificationDate = new Date(dueDate);
    notificationDate.setDate(notificationDate.getDate() + daysOffset);
    notificationDate.setHours(9, 0, 0, 0);

    if (notificationDate.getTime() <= Date.now()) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💸 Recordatorio de Pago',
        body: `${payment.name} vence en ${Math.abs(daysOffset)} día(s)` ,
        data: { paymentId: payment.id, kind: `days_${Math.abs(daysOffset)}` },
        sound: 'default',
      },
      trigger: {
        type: 'date',
        date: notificationDate,
        channelId: Platform.OS === 'android' ? 'payments' : undefined,
      } as any,
    });
  },

  async scheduleSameDayNotifications(payment: any, dueDate: Date, intervalMinutes: number) {
    if (!this.isSupportedInCurrentRuntime()) return;

    const Notifications = await this.getNotificationsModule();

    const startHour = 8;
    const endHour = 20;

    const start = new Date(dueDate);
    start.setHours(startHour, 0, 0, 0);

    const end = new Date(dueDate);
    end.setHours(endHour, 0, 0, 0);

    const step = Math.max(15, intervalMinutes || 60);

    for (let t = new Date(start); t.getTime() < end.getTime(); t = new Date(t.getTime() + step * 60_000)) {
      if (t.getTime() <= Date.now()) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Pago HOY',
          body: `${payment.name} vence hoy. Monto: $${payment.amount}`,
          data: { paymentId: payment.id, kind: 'same_day' },
          sound: 'default',
        },
        trigger: {
          type: 'date',
          date: t,
          channelId: Platform.OS === 'android' ? 'payments' : undefined,
        } as any,
      });
    }
  },

  async rescheduleAllUserPayments(userId: string, preferences: NotificationSettings) {
    await this.configure();

    if (!preferences.enabled) {
      await this.cancelAll();
      return;
    }

    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    for (const payment of payments || []) {
      await this.schedulePaymentNotifications(payment, preferences);
    }
  },
};
