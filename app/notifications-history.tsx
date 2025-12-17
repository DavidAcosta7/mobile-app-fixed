import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { NotificationService } from '../services/notifications.service';

export default function NotificationsHistoryScreen() {
  const { theme: colors } = useTheme();
  const { supabaseUser } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseUser?.id]);

  const loadHistory = async () => {
    if (!supabaseUser?.id) {
      setLoading(false);
      return;
    }

    try {
      const history = await NotificationService.getHistory(supabaseUser.id);
      setNotifications(history);
    } catch (error) {
      console.error('Error loading notification history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    void loadHistory();
  };

  const getNotificationIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case '3_days':
        return 'time-outline';
      case '2_days':
        return 'time-outline';
      case '1_day':
        return 'alert-circle-outline';
      case 'same_day':
        return 'alert-circle';
      default:
        return 'notifications-outline';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case '3_days':
        return '3 días antes';
      case '2_days':
        return '2 días antes';
      case '1_day':
        return '1 día antes';
      case 'same_day':
        return 'Mismo día';
      default:
        return 'Notificación';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Hoy a las ${date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    if (date.toDateString() === yesterday.toDateString()) {
      return `Ayer a las ${date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    return date.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.titleRow}>
          <Ionicons name="time-outline" size={24} color={colors.text} />
          <Text style={[styles.title, { color: colors.text }]}>Historial de Notificaciones</Text>
        </View>

        {notifications.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="notifications-off-outline" size={56} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No hay notificaciones</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aquí aparecerán todas las notificaciones que FluxPay te ha enviado</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((notification) => (
              <View
                key={notification.id}
                style={[
                  styles.notificationCard,
                  {
                    backgroundColor: colors.card,
                    borderLeftColor: colors.primary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.notificationHeader}>
                  <Ionicons name={getNotificationIcon(notification.type)} size={22} color={colors.primary} />
                  <View style={styles.notificationInfo}>
                    <Text style={[styles.notificationTitle, { color: colors.text }]}>
                      {notification.title}
                    </Text>
                    <Text style={[styles.notificationBody, { color: colors.textSecondary }]}>
                      {notification.body}
                    </Text>
                  </View>
                </View>

                <View style={styles.notificationFooter}>
                  <View style={[styles.typeBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.typeText, { color: colors.textSecondary }]}>
                      {getTypeLabel(notification.type)}
                    </Text>
                  </View>
                  <Text style={[styles.notificationDate, { color: colors.textSecondary }]}>
                    {formatDate(notification.sent_at)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  emptyContainer: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    gap: 12,
  },
  notificationCard: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notificationDate: {
    fontSize: 12,
  },
});
