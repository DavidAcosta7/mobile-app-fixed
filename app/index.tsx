import { useEffect, useState } from 'react';
import { useRouter, useSegments, usePathname } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import DashboardScreen from './dashboard';

export default function Index() {
  const { user, supabaseUser, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const [checkingRecovery, setCheckingRecovery] = useState(true);

  useEffect(() => {
    // Verificar si hay un deep link de recuperación de contraseña
    const checkRecoveryLink = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url && (url.includes('reset-password') || url.includes('type=recovery'))) {
          // Si hay un link de recuperación, redirigir a reset-password
          // El supabase procesará automáticamente los parámetros de la URL
          router.replace('/(auth)/reset-password');
          setCheckingRecovery(false);
          return;
        }
      } catch (error) {
        console.error('Error checking initial URL:', error);
      }
      setCheckingRecovery(false);
    };

    checkRecoveryLink();

    // También escuchar cambios en los links mientras la app está abierta
    const subscription = Linking.addEventListener('url', (event) => {
      const { url } = event;
      if (url && (url.includes('reset-password') || url.includes('type=recovery'))) {
        router.replace('/(auth)/reset-password');
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (loading || checkingRecovery) return;

    // Si estamos en una ruta de auth, no redirigir
    if (pathname && (pathname.startsWith('/(auth)') || pathname.includes('reset-password'))) {
      return;
    }

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
  }, [user, loading, pathname, checkingRecovery]);

  if (loading || checkingRecovery) {
    return (
      <View style={styles.container}>
        <Image 
          source={require('../logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return <DashboardScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 200,
    height: 200,
  },
});

