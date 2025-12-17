import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Header } from '../components/Header';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { NotificationService } from '../services/notifications.service';

export default function NotificationPreferencesScreen() {
  const { theme: colors } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [notify3Days, setNotify3Days] = useState(true);
  const [notify2Days, setNotify2Days] = useState(true);
  const [notify1Day, setNotify1Day] = useState(true);
  const [notifySameDay, setNotifySameDay] = useState(true);
  const [sameDayInterval, setSameDayInterval] = useState(60);

  useEffect(() => {
    void loadPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadPreferences = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const prefs = await NotificationService.getPreferences(user.id);
      setEnabled(prefs.notifications_enabled);
      setNotify3Days(prefs.notify_3_days);
      setNotify2Days(prefs.notify_2_days);
      setNotify1Day(prefs.notify_1_day);
      setNotifySameDay(prefs.notify_same_day);
      setSameDayInterval(prefs.same_day_interval);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (updates: any = {}) => {
    if (!user?.id) return;

    try {
      setSaving(true);

      const preferences = {
        notifications_enabled: enabled,
        notify_3_days: notify3Days,
        notify_2_days: notify2Days,
        notify_1_day: notify1Day,
        notify_same_day: notifySameDay,
        same_day_interval: sameDayInterval,
        ...updates,
      };

      await NotificationService.updatePreferences(user.id, preferences);

      await NotificationService.rescheduleAllUserPayments(user.id, {
        user_id: user.id,
        notifications_enabled: !!preferences.notifications_enabled,
        notify_3_days: !!preferences.notify_3_days,
        notify_2_days: !!preferences.notify_2_days,
        notify_1_day: !!preferences.notify_1_day,
        notify_same_day: !!preferences.notify_same_day,
        same_day_interval:
          typeof preferences.same_day_interval === 'number' ? preferences.same_day_interval : 60,
      });
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table')) {
        Alert.alert(
          'No disponible',
          'Las tablas de notificaciones no existen en Supabase. Ejecuta el SQL de migración para habilitar esta sección.'
        );
        return;
      }
      Alert.alert('Error', 'No se pudieron guardar las preferencias');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (value: boolean) => {
    if (value) {
      const granted = await NotificationService.requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permisos denegados',
          'Para recibir notificaciones, debes habilitar los permisos en la configuración de tu dispositivo'
        );
        return;
      }
    }

    setEnabled(value);
    await savePreferences({ notifications_enabled: value });
  };

  const handleToggle3Days = (value: boolean) => {
    setNotify3Days(value);
    void savePreferences({ notify_3_days: value });
  };

  const handleToggle2Days = (value: boolean) => {
    setNotify2Days(value);
    void savePreferences({ notify_2_days: value });
  };

  const handleToggle1Day = (value: boolean) => {
    setNotify1Day(value);
    void savePreferences({ notify_1_day: value });
  };

  const handleToggleSameDay = (value: boolean) => {
    setNotifySameDay(value);
    void savePreferences({ notify_same_day: value });
  };

  const updateInterval = (minutes: number) => {
    setSameDayInterval(minutes);
    void savePreferences({ same_day_interval: minutes });
  };

  const handleSelectInterval = () => {
    Alert.alert(
      'Frecuencia de Recordatorios',
      'Cada cuántos minutos quieres recibir notificaciones el día del vencimiento:',
      [
        { text: '15 minutos', onPress: () => updateInterval(15) },
        { text: '30 minutos', onPress: () => updateInterval(30) },
        { text: '45 minutos', onPress: () => updateInterval(45) },
        { text: '60 minutos (1 hora)', onPress: () => updateInterval(60) },
        { text: '90 minutos (1.5 horas)', onPress: () => updateInterval(90) },
        { text: '120 minutos (2 horas)', onPress: () => updateInterval(120) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>🔔 Preferencias de Notificaciones</Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.switchRow, { borderBottomColor: colors.border }]}>
            <View style={styles.switchInfo}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Activar Notificaciones</Text>
              <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
                Recibir recordatorios de pagos próximos
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.card}
              disabled={saving}
            />
          </View>
        </View>

        {enabled && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>📅 Días de Anticipación</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Elige con cuántos días de anticipación quieres ser notificado
              </Text>

              <View style={[styles.switchRow, { borderBottomColor: colors.border }]}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>3 días antes</Text>
                  <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>Notificación 3 días antes del vencimiento</Text>
                </View>
                <Switch
                  value={notify3Days}
                  onValueChange={handleToggle3Days}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.card}
                  disabled={saving}
                />
              </View>

              <View style={[styles.switchRow, { borderBottomColor: colors.border }]}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>2 días antes</Text>
                  <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>Notificación 2 días antes del vencimiento</Text>
                </View>
                <Switch
                  value={notify2Days}
                  onValueChange={handleToggle2Days}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.card}
                  disabled={saving}
                />
              </View>

              <View style={[styles.switchRow, { borderBottomColor: colors.border }]}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>1 día antes</Text>
                  <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>Notificación 1 día antes del vencimiento</Text>
                </View>
                <Switch
                  value={notify1Day}
                  onValueChange={handleToggle1Day}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.card}
                  disabled={saving}
                />
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>🔴 Notificaciones el Mismo Día</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Recordatorios frecuentes el día del vencimiento
              </Text>

              <View style={[styles.switchRow, { borderBottomColor: colors.border }]}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Mismo día del vencimiento</Text>
                  <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>Recordatorios cada cierto tiempo el día del pago</Text>
                </View>
                <Switch
                  value={notifySameDay}
                  onValueChange={handleToggleSameDay}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.card}
                  disabled={saving}
                />
              </View>

              {notifySameDay && (
                <TouchableOpacity
                  style={[styles.intervalButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={handleSelectInterval}
                  disabled={saving}
                >
                  <View style={styles.intervalInfo}>
                    <Text style={[styles.intervalLabel, { color: colors.text }]}>⏱️ Frecuencia de Recordatorios</Text>
                    <Text style={[styles.intervalValue, { color: colors.primary }]}>Cada {sameDayInterval} minutos</Text>
                  </View>
                  <Text style={[styles.intervalArrow, { color: colors.textSecondary }]}>›</Text>
                </TouchableOpacity>
              )}
            </View>

            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: colors.card,
                  borderLeftColor: colors.primary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={styles.infoIcon}>💡</Text>
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>¿Cómo funciona?</Text>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>Las notificaciones se programan automáticamente cuando agregas o editas un pago. Si cambias estas preferencias, se aplicarán reprogramando todos tus pagos.</Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  switchDesc: {
    fontSize: 13,
  },
  intervalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  intervalInfo: {
    flex: 1,
  },
  intervalLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  intervalValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  intervalArrow: {
    fontSize: 24,
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    gap: 12,
    borderWidth: 1,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
