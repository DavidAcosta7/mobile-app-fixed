import { useState } from 'react';
import { View, Text, ScrollView, Alert, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterPage() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { signUp } = useAuth();

  const handleSubmit = async () => {
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      Alert.alert('Contraseña muy corta', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (telefono.length < 10) {
      setError('El número de teléfono debe tener al menos 10 dígitos');
      Alert.alert('Teléfono inválido', 'El número de teléfono debe tener al menos 10 dígitos');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, nombre, telefono);
      Alert.alert('Cuenta creada', 'Ya puedes iniciar sesión con tu cuenta');
      router.replace('/(auth)/login');
    } catch (err: any) {
      const errorMessage = err.message || 'Error al crear cuenta';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="flex-1 items-center justify-center p-5">
        <View className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-md">
          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-xl bg-blue-600 items-center justify-center mb-4">
              <Text className="text-3xl">💳</Text>
            </View>
            <Text className="text-3xl font-bold text-gray-900 mb-2">Crear cuenta</Text>
            <Text className="text-gray-600 text-center">
              Comienza a gestionar tus pagos de forma inteligente
            </Text>
          </View>

          {error && (
            <View className="flex-row items-start gap-2 p-3 rounded-lg bg-red-50 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          )}

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">Nombre completo</Text>
              <TextInput
                value={nombre}
                onChangeText={setNombre}
                placeholder="Juan Pérez"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                className="border border-gray-300 rounded-xl p-4 text-base bg-white"
                editable={!loading}
              />
            </View>
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="juan@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                className="border border-gray-300 rounded-xl p-4 text-base bg-white"
                editable={!loading}
              />
            </View>
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">Número de teléfono</Text>
              <TextInput
                value={telefono}
                onChangeText={(text) => setTelefono(text.replace(/[^\d+\s]/g, ''))}
                placeholder="+57 300 123 4567"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                className="border border-gray-300 rounded-xl p-4 text-base bg-white"
                editable={!loading}
              />
              <Text className="text-xs text-gray-500 mt-1">
                Incluye el código de país (ej: +57)
              </Text>
            </View>
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">Contraseña</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                className="border border-gray-300 rounded-xl p-4 text-base bg-white"
                editable={!loading}
              />
              <Text className="text-xs text-gray-500 mt-1">
                Debe tener al menos 8 caracteres
              </Text>
            </View>
          </View>

          <View className="mt-6 space-y-4">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className={`rounded-xl p-4 items-center justify-center mb-4 ${
                loading ? 'bg-gray-400 opacity-60' : 'bg-blue-600'
              }`}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-base font-semibold">
                  Crear cuenta
                </Text>
              )}
            </TouchableOpacity>
            <Text className="text-sm text-center text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link href="/(auth)/login" className="text-blue-600 font-semibold">
                Inicia sesión
              </Link>
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

