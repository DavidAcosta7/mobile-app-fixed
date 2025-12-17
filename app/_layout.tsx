import '../global.css';
import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { NotificationService } from '../services/notifications.service';

function RootLayoutContent() {
  const { loading, user, supabaseUser } = useAuth();
  const router = useRouter();
  const [showError, setShowError] = useState(false);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setShowError(true);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    const authUserId = supabaseUser?.id ?? (user as any)?.id;
    if (!authUserId) return;
    if (!NotificationService.isSupportedInCurrentRuntime()) return;

    const allowedTypes = new Set(['3_days', '2_days', '1_day', 'same_day']);

    const setup = async () => {
      try {
        await NotificationService.configure();

        notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
          console.log('Notification received:', notification);
          const content = notification?.request?.content;
          const data = (content?.data ?? {}) as any;
          const title = String(content?.title ?? '');
          const body = String(content?.body ?? '');

          const paymentId = data?.paymentId;
          const type = data?.type;

          if (!paymentId || !allowedTypes.has(String(type))) return;

          void NotificationService.saveToHistory({
            userId: String(data?.userId ?? authUserId),
            paymentId: String(paymentId),
            title,
            body,
            type: type,
            paymentName: data?.paymentName ?? body.split(' - ')[0] ?? '',
            dueDate: data?.dueDate ?? new Date(),
          });
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
          console.log('Notification tapped:', response);
          const data = (response?.notification?.request?.content?.data ?? {}) as any;
          const screen = data?.screen;
          if (typeof screen === 'string' && screen.length > 0) {
            router.push(screen as any);
          }
        });
      } catch (e) {
        console.error('Error setting up notification listeners:', e);
      }
    };

    void setup();

    return () => {
      if (notificationListener.current?.remove) notificationListener.current.remove();
      if (responseListener.current?.remove) responseListener.current.remove();
    };
  }, [supabaseUser?.id, (user as any)?.id]);

  if (loading && !showError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando FluxPay...</Text>
      </View>
    );
  }

  if (showError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error de Carga</Text>
        <Text style={styles.errorText}>
          La app tardó demasiado en cargar. Por favor, cierra y abre de nuevo.
        </Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="achievements" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="notifications-history" options={{ headerShown: false }} />
      <Stack.Screen name="notification-preferences" options={{ headerShown: false }} />
      <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <RootLayoutContent />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

