import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../components/Header';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';

export default function SettingsScreen() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { theme: colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
          <Text style={[styles.title, { color: colors.text }]}>Configuración</Text>
        </View>

        {isAdmin && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Administración</Text>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push('/admin')}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-checkmark-outline" size={24} color={colors.text} style={styles.menuIcon} />
              <View style={styles.menuInfo}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>Panel de Administración</Text>
                <Text style={[styles.menuDesc, { color: colors.textSecondary }]}>Gestiona usuarios, auditoría y reportes</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} style={styles.menuArrow} />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Notificaciones</Text>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/notification-preferences')}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} style={styles.menuIcon} />
            <View style={styles.menuInfo}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Preferencias de Notificaciones</Text>
              <Text style={[styles.menuDesc, { color: colors.textSecondary }]}>Configura cuándo recibir recordatorios</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} style={styles.menuArrow} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/notifications-history')}
            activeOpacity={0.8}
          >
            <Ionicons name="time-outline" size={24} color={colors.text} style={styles.menuIcon} />
            <View style={styles.menuInfo}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Historial de Notificaciones</Text>
              <Text style={[styles.menuDesc, { color: colors.textSecondary }]}>Ver todas las notificaciones enviadas</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} style={styles.menuArrow} />
          </TouchableOpacity>
        </View>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
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
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuIcon: {
    marginRight: 12,
    width: 32,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuDesc: {
    fontSize: 13,
  },
  menuArrow: {
    width: 24,
    height: 24,
  },
});
