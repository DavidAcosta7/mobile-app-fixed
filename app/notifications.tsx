import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Header } from '../components/Header';

export default function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>📢 Notificaciones</Text>
        <Text style={styles.message}>
          Las notificaciones push no están disponibles en Expo Go.
        </Text>
        <Text style={styles.submessage}>
          Esta funcionalidad estará disponible en la versión APK final.
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

