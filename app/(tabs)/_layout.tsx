import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { View, ActivityIndicator, Text } from 'react-native';

export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerTintColor: '#111827',
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <Text className={`text-2xl ${focused ? 'text-blue-600' : 'text-gray-400'}`}>
              🏠
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: 'Logros',
          tabBarLabel: 'Logros',
          tabBarIcon: ({ color, focused }) => (
            <Text className={`text-2xl ${focused ? 'text-blue-600' : 'text-gray-400'}`}>
              🏆
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configuración',
          tabBarLabel: 'Configuración',
          tabBarIcon: ({ color, focused }) => (
            <Text className={`text-2xl ${focused ? 'text-blue-600' : 'text-gray-400'}`}>
              ⚙️
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}

