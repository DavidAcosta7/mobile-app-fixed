import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Header } from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function NotificationsScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Ionicons name="notifications-outline" size={24} color={theme.text} />
          <Text style={[styles.title, { color: theme.text }]}>Notificaciones</Text>
        </View>
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          Los recordatorios se programan localmente en tu dispositivo.
        </Text>
        <Text style={[styles.submessage, { color: theme.textSecondary }]}>
          Para notificaciones push reales (remotas) se requiere build APK/AAB.
        </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  submessage: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

