import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Header } from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Ionicons name="settings-outline" size={24} color={theme.text} />
          <Text style={[styles.title, { color: theme.text }]}>Configuraciones</Text>
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={[styles.adminButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push('/admin')}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark-outline" size={24} color={theme.text} />
            <View style={styles.adminButtonTextContainer}>
              <Text style={[styles.adminButtonTitle, { color: theme.text }]}>Panel de Administración</Text>
              <Text style={styles.adminButtonSubtitle}>
                Gestiona usuarios, auditoría y reportes
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.adminButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => router.push('/notification-settings')}
          activeOpacity={0.8}
        >
          <Ionicons name="notifications-outline" size={24} color={theme.text} />
          <View style={styles.adminButtonTextContainer}>
            <Text style={[styles.adminButtonTitle, { color: theme.text }]}>Preferencias de notificaciones</Text>
            <Text style={styles.adminButtonSubtitle}>
              Recordatorios de pagos
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>

        <Text style={[styles.message, { color: theme.textSecondary }]}>Esta sección estará disponible próximamente.</Text>
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
  },
  adminButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  adminButtonTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  adminButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  adminButtonSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
});
