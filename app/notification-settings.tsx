import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Picker } from '@react-native-picker/picker';
import { NotificationService } from '../services/notifications.service';
import { useTheme } from '../contexts/ThemeContext';

type NotificationSettingsRow = {
  user_id: string;
  notifications_enabled: boolean;
  notify_3_days: boolean;
  notify_2_days: boolean;
  notify_1_day: boolean;
  notify_same_day: boolean;
  same_day_interval?: number;
};

const DEFAULT_SETTINGS: Omit<NotificationSettingsRow, 'user_id'> = {
  notifications_enabled: false,
  notify_3_days: true,
  notify_2_days: true,
  notify_1_day: true,
  notify_same_day: true,
  same_day_interval: 60,
};

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<NotificationSettingsRow | null>(null);

  const loadSettings = async () => {
    try {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          Alert.alert(
            'No disponible',
            'La tabla notification_preferences no existe en Supabase. Ejecuta el SQL de migración para habilitar esta sección.'
          );
          setSettings({ user_id: user.id, ...DEFAULT_SETTINGS });
          return;
        }

        if (error.code === 'PGRST116') {
          // No row found
          setSettings({ user_id: user.id, ...DEFAULT_SETTINGS });
          return;
        }

        throw error;
      }

      if (data) {
        setSettings({
          user_id: user.id,
          notifications_enabled: !!(data as any).notifications_enabled,
          notify_3_days: !!(data as any).notify_3_days,
          notify_2_days: !!(data as any).notify_2_days,
          notify_1_day: !!(data as any).notify_1_day,
          notify_same_day: !!(data as any).notify_same_day,
          same_day_interval: typeof (data as any).same_day_interval === 'number' ? (data as any).same_day_interval : 60,
        });
      }
    } catch (e: any) {
      console.error('Error loading notification_preferences:', e);
      Alert.alert('Error', 'No se pudieron cargar tus configuraciones de notificación');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (next: NotificationSettingsRow) => {
    try {
      if (!user?.id) return;
      setSaving(true);

      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: user.id,
            notifications_enabled: next.notifications_enabled,
            notify_3_days: next.notify_3_days,
            notify_2_days: next.notify_2_days,
            notify_1_day: next.notify_1_day,
            notify_same_day: next.notify_same_day,
            same_day_interval: next.same_day_interval ?? 60,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          Alert.alert(
            'No disponible',
            'No se pudo guardar porque la tabla notification_preferences no existe en Supabase. Ejecuta el SQL de migración.'
          );
          return;
        }
        throw error;
      }
    } catch (e: any) {
      console.error('Error saving notification_settings:', e);
      Alert.alert('Error', 'No se pudieron guardar tus configuraciones');
    } finally {
      setSaving(false);
    }
  };

  const setAndSave = (patch: Partial<NotificationSettingsRow>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    void saveSettings(next);
  };

  const applyNativeScheduling = async (next: NotificationSettingsRow) => {
    try {
      if (!user?.id) return;

      if (!next.notifications_enabled) {
        await NotificationService.cancelAll();
        return;
      }

      await NotificationService.requestPermissions();
      await NotificationService.rescheduleAllUserPayments(user.id, {
        user_id: user.id,
        notifications_enabled: next.notifications_enabled,
        notify_3_days: next.notify_3_days,
        notify_2_days: next.notify_2_days,
        notify_1_day: next.notify_1_day,
        notify_same_day: next.notify_same_day,
        same_day_interval: next.same_day_interval ?? 60,
      });
    } catch (e) {
      console.error('Error scheduling native notifications:', e);
    }
  };

  const setSaveAndSchedule = (patch: Partial<NotificationSettingsRow>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    void saveSettings(next);
    void applyNativeScheduling(next);
  };

  useEffect(() => {
    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Ionicons name="notifications-outline" size={24} color={theme.text} />
          <Text style={[styles.title, { color: theme.text }]}>Preferencias de notificación</Text>
        </View>

        {loading || !settings ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando...</Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>Notificaciones</Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Activar o desactivar recordatorios</Text>
              </View>
              <Switch
                value={settings.notifications_enabled}
                onValueChange={(v) => setSaveAndSchedule({ notifications_enabled: v })}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={[styles.row, !settings.notifications_enabled && styles.rowDisabled]}>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>3 días antes</Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Recordatorio anticipado</Text>
              </View>
              <Switch
                value={settings.notify_3_days}
                disabled={!settings.notifications_enabled}
                onValueChange={(v) => setSaveAndSchedule({ notify_3_days: v })}
              />
            </View>

            <View style={[styles.row, !settings.notifications_enabled && styles.rowDisabled]}>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>2 días antes</Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Recordatorio anticipado</Text>
              </View>
              <Switch
                value={settings.notify_2_days}
                disabled={!settings.notifications_enabled}
                onValueChange={(v) => setSaveAndSchedule({ notify_2_days: v })}
              />
            </View>

            <View style={[styles.row, !settings.notifications_enabled && styles.rowDisabled]}>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>1 día antes</Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Recordatorio anticipado</Text>
              </View>
              <Switch
                value={settings.notify_1_day}
                disabled={!settings.notifications_enabled}
                onValueChange={(v) => setSaveAndSchedule({ notify_1_day: v })}
              />
            </View>

            <View style={[styles.row, !settings.notifications_enabled && styles.rowDisabled]}>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>Mismo día</Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Notificar el día de vencimiento</Text>
              </View>
              <Switch
                value={settings.notify_same_day}
                disabled={!settings.notifications_enabled}
                onValueChange={(v) => setSaveAndSchedule({ notify_same_day: v })}
              />
            </View>

            {settings.notifications_enabled && settings.notify_same_day && (
              <View style={[styles.row, styles.rowColumn]}>
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: theme.text }]}>Frecuencia de recordatorios</Text>
                  <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Cada X minutos (desde 8:00 hasta 20:00)</Text>
                </View>
                <View style={[styles.pickerContainer, { borderColor: theme.border, backgroundColor: theme.background }]}>
                  <Picker
                    selectedValue={settings.same_day_interval ?? 60}
                    onValueChange={(v: number) => setSaveAndSchedule({ same_day_interval: v })}
                  >
                    <Picker.Item label="Cada 15 minutos" value={15} />
                    <Picker.Item label="Cada 30 minutos" value={30} />
                    <Picker.Item label="Cada 45 minutos" value={45} />
                    <Picker.Item label="Cada 60 minutos" value={60} />
                    <Picker.Item label="Cada 90 minutos" value={90} />
                    <Picker.Item label="Cada 120 minutos" value={120} />
                  </Picker>
                </View>
              </View>
            )}

            {saving && (
              <View style={styles.savingRow}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={[styles.savingText, { color: theme.textSecondary }]}>Guardando...</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 10,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowText: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  pickerContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  savingText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
